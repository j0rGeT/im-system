const express = require('express');
const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/private/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ]
    })
    .populate('sender', 'username avatar')
    .populate('recipient', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('获取私聊消息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: '您不是该群组的成员' });
    }

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username avatar')
      .populate('readBy.user', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('获取群聊消息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/private', auth, async (req, res) => {
  try {
    const { recipientId, content, messageType = 'text' } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ error: '接收者和消息内容都是必需的' });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ error: '不能给自己发消息' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: '接收者不存在' });
    }

    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
      messageType
    });

    await message.save();
    await message.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'recipient', select: 'username avatar' }
    ]);

    res.status(201).json({
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送私聊消息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/group', auth, async (req, res) => {
  try {
    const { groupId, content, messageType = 'text' } = req.body;

    if (!groupId || !content) {
      return res.status(400).json({ error: '群组ID和消息内容都是必需的' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: '您不是该群组的成员' });
    }

    const message = new Message({
      sender: req.user._id,
      group: groupId,
      content: content.trim(),
      messageType,
      readBy: [{ user: req.user._id }]
    });

    await message.save();
    await message.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'readBy.user', select: 'username' }
    ]);

    group.lastMessage = message._id;
    group.lastActivity = new Date();
    await group.save();

    res.status(201).json({
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送群聊消息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    const hasReadPermission = message.recipient?.toString() === req.user._id.toString() ||
                             (message.group && message.sender.toString() !== req.user._id.toString());

    if (!hasReadPermission) {
      return res.status(403).json({ error: '没有权限标记此消息为已读' });
    }

    const alreadyRead = message.readBy.some(
      read => read.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({ user: req.user._id });
      await message.save();
    }

    res.json({ message: '消息标记为已读' });
  } catch (error) {
    console.error('标记消息已读错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '只能编辑自己的消息' });
    }

    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'recipient', select: 'username avatar' },
      { path: 'readBy.user', select: 'username' }
    ]);

    res.json({
      message: '消息编辑成功',
      data: message
    });
  } catch (error) {
    console.error('编辑消息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '只能删除自己的消息' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: '消息删除成功' });
  } catch (error) {
    console.error('删除消息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;