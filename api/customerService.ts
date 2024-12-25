import { NextApiRequest, NextApiResponse } from 'next';
import {
  getAllCustomerServices,
  addCustomerService,
  deleteCustomerService
} from '../db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const customerServices = await getAllCustomerServices();
        return res.status(200).json(customerServices);

      case 'POST':
        const { wechatId, name } = req.body;
        if (!wechatId || !name) {
          return res.status(400).json({ error: '微信ID和名称都是必填项' });
        }
        const newCustomerService = await addCustomerService({ wechatId, name });
        return res.status(201).json(newCustomerService);

      case 'DELETE':
        const { id } = req.query;
        if (!id || Array.isArray(id)) {
          return res.status(400).json({ error: '无效的ID' });
        }
        await deleteCustomerService(parseInt(id));
        return res.status(200).json({ message: '删除成功' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('客服API错误:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 