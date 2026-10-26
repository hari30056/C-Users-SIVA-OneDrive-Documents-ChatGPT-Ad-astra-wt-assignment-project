import { prisma, isDbConnected } from '../config/database';
import { inMemoryDb, PaymentTransactionEntity } from './dbStore';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus } from '../types';

export const paymentRepository = {
  async findById(id: string): Promise<PaymentTransactionEntity | null> {
    if (isDbConnected) {
      const tx = await prisma.paymentTransaction.findUnique({ where: { id } });
      if (!tx) return null;
      return {
        id: tx.id,
        orderId: tx.orderId,
        transactionReference: tx.transactionReference,
        amount: Number(tx.amount),
        status: tx.status as PaymentStatus,
        gatewayResponse: tx.gatewayResponse,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      };
    }
    return inMemoryDb.paymentTransactions.get(id) || null;
  },

  async findByOrderId(orderId: string): Promise<PaymentTransactionEntity[]> {
    if (isDbConnected) {
      const list = await prisma.paymentTransaction.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((tx) => ({
        id: tx.id,
        orderId: tx.orderId,
        transactionReference: tx.transactionReference,
        amount: Number(tx.amount),
        status: tx.status as PaymentStatus,
        gatewayResponse: tx.gatewayResponse,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      }));
    }
    return Array.from(inMemoryDb.paymentTransactions.values())
      .filter((tx) => tx.orderId === orderId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async create(orderId: string, amount: number): Promise<PaymentTransactionEntity> {
    const reference = `TXN-${Date.now().toString().slice(-8)}-${uuidv4().slice(0, 6).toUpperCase()}`;

    if (isDbConnected) {
      const tx = await prisma.paymentTransaction.create({
        data: {
          orderId,
          transactionReference: reference,
          amount,
          status: 'PENDING',
        },
      });
      return {
        id: tx.id,
        orderId: tx.orderId,
        transactionReference: tx.transactionReference,
        amount: Number(tx.amount),
        status: tx.status as PaymentStatus,
        gatewayResponse: tx.gatewayResponse,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      };
    }

    const tx: PaymentTransactionEntity = {
      id: uuidv4(),
      orderId,
      transactionReference: reference,
      amount,
      status: 'PENDING',
      gatewayResponse: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDb.paymentTransactions.set(tx.id, tx);
    return tx;
  },

  async updateStatus(
    id: string,
    status: PaymentStatus,
    gatewayResponse?: any
  ): Promise<PaymentTransactionEntity | null> {
    const responseStr = gatewayResponse ? JSON.stringify(gatewayResponse) : null;

    if (isDbConnected) {
      const updated = await prisma.paymentTransaction.update({
        where: { id },
        data: {
          status,
          gatewayResponse: responseStr,
          updatedAt: new Date(),
        },
      });
      return {
        id: updated.id,
        orderId: updated.orderId,
        transactionReference: updated.transactionReference,
        amount: Number(updated.amount),
        status: updated.status as PaymentStatus,
        gatewayResponse: updated.gatewayResponse,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    const tx = inMemoryDb.paymentTransactions.get(id);
    if (!tx) return null;
    tx.status = status;
    tx.gatewayResponse = responseStr;
    tx.updatedAt = new Date();
    return tx;
  },

  async findAllAdmin(): Promise<PaymentTransactionEntity[]> {
    if (isDbConnected) {
      const list = await prisma.paymentTransaction.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return list.map((tx) => ({
        id: tx.id,
        orderId: tx.orderId,
        transactionReference: tx.transactionReference,
        amount: Number(tx.amount),
        status: tx.status as PaymentStatus,
        gatewayResponse: tx.gatewayResponse,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      }));
    }
    return Array.from(inMemoryDb.paymentTransactions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },
};
