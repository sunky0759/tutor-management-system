import { NextApiRequest, NextApiResponse } from 'next';
import {
  getAllTutorRequests,
  addTutorRequest,
  updateTutorRequest,
  deleteTutorRequest,
  searchTutorRequests
} from '../db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        // 处理搜索和筛选
        const { searchText, city, district, gradeLevel, subject } = req.query;
        
        if (searchText || city || district || gradeLevel || subject) {
          const results = await searchTutorRequests({
            searchText: searchText as string,
            city: city as string,
            district: district as string,
            gradeLevel: gradeLevel as string,
            subject: subject as string
          });
          return res.status(200).json(results);
        }
        
        // 如果没有搜索参数，返回所有记录
        const tutorRequests = await getAllTutorRequests();
        return res.status(200).json(tutorRequests);

      case 'POST':
        const { content, city: cityPost, district: districtPost, gradeLevel: gradeLevelPost, subjects, customerServiceId } = req.body;
        
        if (!content) {
          return res.status(400).json({ error: '内容是必填项' });
        }
        
        const newTutorRequest = await addTutorRequest({
          content,
          city: cityPost,
          district: districtPost,
          gradeLevel: gradeLevelPost,
          subjects,
          customerServiceId
        });
        return res.status(201).json(newTutorRequest);

      case 'PUT':
        const { id } = req.query;
        if (!id || Array.isArray(id)) {
          return res.status(400).json({ error: '无效的ID' });
        }
        
        const updatedTutorRequest = await updateTutorRequest(parseInt(id), req.body);
        if (!updatedTutorRequest) {
          return res.status(404).json({ error: '未找到要更新的记录' });
        }
        return res.status(200).json(updatedTutorRequest);

      case 'DELETE':
        const deleteId = req.query.id;
        if (!deleteId || Array.isArray(deleteId)) {
          return res.status(400).json({ error: '无效的ID' });
        }
        
        await deleteTutorRequest(parseInt(deleteId));
        return res.status(200).json({ message: '删除成功' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('家教信息API错误:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 