const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: '搜索查询至少需要2个字符' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('username email avatar status').limit(10);

    res.json({ users });
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/request', auth, async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '用户ID是必需的' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: '不能向自己发送好友请求' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const existingFriend = req.user.friends.find(
      friend => friend.user.toString() === userId
    );
    if (existingFriend) {
      return res.status(400).json({ error: '已经是好友了' });
    }

    const existingRequest = targetUser.friendRequests.find(
      request => request.from.toString() === req.user._id.toString()
    );
    if (existingRequest) {
      return res.status(400).json({ error: '好友请求已发送' });
    }

    targetUser.friendRequests.push({
      from: req.user._id,
      message: message || ''
    });
    await targetUser.save();

    res.json({ message: '好友请求发送成功' });
  } catch (error) {
    console.error('发送好友请求错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/accept', auth, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: '请求ID是必需的' });
    }

    const user = await User.findById(req.user._id);
    const requestIndex = user.friendRequests.findIndex(
      request => request._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ error: '好友请求不存在' });
    }

    const request = user.friendRequests[requestIndex];
    const friendUser = await User.findById(request.from);

    if (!friendUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    user.friends.push({ user: friendUser._id });
    friendUser.friends.push({ user: user._id });

    user.friendRequests.splice(requestIndex, 1);

    await Promise.all([user.save(), friendUser.save()]);

    res.json({ message: '好友请求接受成功' });
  } catch (error) {
    console.error('接受好友请求错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/reject', auth, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: '请求ID是必需的' });
    }

    const user = await User.findById(req.user._id);
    const requestIndex = user.friendRequests.findIndex(
      request => request._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ error: '好友请求不存在' });
    }

    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    res.json({ message: '好友请求拒绝成功' });
  } catch (error) {
    console.error('拒绝好友请求错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;

    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userFriendIndex = user.friends.findIndex(
      f => f.user.toString() === friendId
    );
    const friendUserIndex = friend.friends.findIndex(
      f => f.user.toString() === req.user._id.toString()
    );

    if (userFriendIndex === -1) {
      return res.status(400).json({ error: '不是好友关系' });
    }

    user.friends.splice(userFriendIndex, 1);
    if (friendUserIndex !== -1) {
      friend.friends.splice(friendUserIndex, 1);
    }

    await Promise.all([user.save(), friend.save()]);

    res.json({ message: '好友删除成功' });
  } catch (error) {
    console.error('删除好友错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends.user', 'username email avatar status lastSeen');
    
    res.json({ friends: user.friends });
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;