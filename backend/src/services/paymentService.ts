import { paymentRepository } from '../repositories/paymentRepository';
import { orderRepository } from '../repositories/orderRepository';
import { enqueuePaymentJob } from '../queues/paymentQueue';
import { AppError } from '../utils/errors';
import { AuthUser, PaymentStatus } from '../types';

export const paymentService = {
  async processPayment(
    user: AuthUser,
    data: {
      orderId: string;
      simulateFailure?: boolean;
      paymentMethod?: string;
    }
  ): Promise<{
    transactionId: string;
    orderId: string;
    status: PaymentStatus;
    transactionReference: string;
    amount: number;
    message: string;
  }> {
    const order = await orderRepository.findById(data.orderId);
    if (!order) {
      throw AppError.notFound('Order');
    }

    if (user.role === 'ATTENDEE' && order.userId !== user.id) {
      throw AppError.forbidden('You can only pay for your own orders');
    }

    if (order.status !== 'PENDING') {
      throw AppError.badRequest(`Order is already ${order.status.toLowerCase()} and cannot be processed`);
    }

    // Check if an existing transaction is already pending
    const existingPending = order.transactions.find((tx) => tx.status === 'PENDING');
    if (existingPending) {
      return {
        transactionId: existingPending.id,
        orderId: order.id,
        status: 'PENDING',
        transactionReference: existingPending.transactionReference,
        amount: existingPending.amount,
        message: 'Payment is currently processing asynchronously.',
      };
    }

    // Create a new PENDING transaction
    const transaction = await paymentRepository.create(order.id, order.totalAmount);

    // Asynchronously dispatch payment processing to background worker
    await enqueuePaymentJob({
      orderId: order.id,
      transactionId: transaction.id,
      simulateFailure: data.simulateFailure,
    });

    return {
      transactionId: transaction.id,
      orderId: order.id,
      status: 'PENDING',
      transactionReference: transaction.transactionReference,
      amount: transaction.amount,
      message: 'Payment processing initiated. Check status endpoint for updates.',
    };
  },

  async getPaymentStatus(transactionId: string, user: AuthUser) {
    const transaction = await paymentRepository.findById(transactionId);
    if (!transaction) {
      throw AppError.notFound('Payment Transaction');
    }

    const order = await orderRepository.findById(transaction.orderId);
    if (!order) throw AppError.notFound('Order');

    if (user.role === 'ATTENDEE' && order.userId !== user.id) {
      throw AppError.forbidden('You can only view your own payment transactions');
    }

    return {
      transactionId: transaction.id,
      orderId: transaction.orderId,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      status: transaction.status,
      amount: transaction.amount,
      transactionReference: transaction.transactionReference,
      gatewayResponse: transaction.gatewayResponse ? JSON.parse(transaction.gatewayResponse) : null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      tickets: order.tickets,
    };
  },

  async getAllTransactionsAdmin() {
    return paymentRepository.findAllAdmin();
  },
};
