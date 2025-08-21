const express = require('express');
const Group = require('../models/Group');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, memberIds = [] } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '群组名称是必需的' });
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      owner: req.user._id,
      admins: [req.user._id],
      members: [
        { user: req.user._id, role: 'owner' },
        ...memberIds.map(id => ({ user: id, role: 'member' }))
      ]
    });

    await group.save();
    await group.populate('members.user', 'username email avatar status');

    res.status(201).json({
      message: '群组创建成功',
      group
    });
  } catch (error) {
    console.error('创建群组错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id
    })
    .populate('members.user', 'username email avatar status')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    res.json({ groups });
  } catch (error) {
    console.error('获取群组列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('members.user', 'username email avatar status lastSeen')
      .populate('owner', 'username email avatar')
      .populate('admins', 'username email avatar');

    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    const isMember = group.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: '您不是该群组的成员' });
    }

    res.json({ group });
  } catch (error) {
    console.error('获取群组详情错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: '用户ID列表是必需的' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    const userMember = group.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!userMember) {
      return res.status(403).json({ error: '您不是该群组的成员' });
    }

    const isOwnerOrAdmin = group.owner.toString() === req.user._id.toString() ||
                          group.admins.includes(req.user._id);

    if (!isOwnerOrAdmin && !group.settings.allowMemberInvite) {
      return res.status(403).json({ error: '只有管理员可以邀请新成员' });
    }

    const existingMemberIds = group.members.map(m => m.user.toString());
    const newMemberIds = userIds.filter(id => !existingMemberIds.includes(id));

    if (newMemberIds.length === 0) {
      return res.status(400).json({ error: '所有用户都已经是群组成员' });
    }

    if (group.members.length + newMemberIds.length > group.settings.maxMembers) {
      return res.status(400).json({ error: '超过群组最大成员数限制' });
    }

    const newMembers = newMemberIds.map(userId => ({
      user: userId,
      role: 'member'
    }));

    group.members.push(...newMembers);
    group.lastActivity = new Date();
    await group.save();

    await group.populate('members.user', 'username email avatar status');

    res.json({
      message: '成员添加成功',
      group
    });
  } catch (error) {
    console.error('添加群组成员错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:groupId/members/:userId', auth, async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    const isOwner = group.owner.toString() === req.user._id.toString();
    const isAdmin = group.admins.includes(req.user._id);
    const isSelf = userId === req.user._id.toString();

    if (!isOwner && !isAdmin && !isSelf) {
      return res.status(403).json({ error: '没有权限移除该成员' });
    }

    if (userId === group.owner.toString()) {
      return res.status(400).json({ error: '不能移除群组所有者' });
    }

    const memberIndex = group.members.findIndex(
      member => member.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(400).json({ error: '用户不是群组成员' });
    }

    group.members.splice(memberIndex, 1);
    
    const adminIndex = group.admins.indexOf(userId);
    if (adminIndex !== -1) {
      group.admins.splice(adminIndex, 1);
    }

    group.lastActivity = new Date();
    await group.save();

    res.json({ message: '成员移除成功' });
  } catch (error) {
    console.error('移除群组成员错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, settings } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    const isOwnerOrAdmin = group.owner.toString() === req.user._id.toString() ||
                          group.admins.includes(req.user._id);

    if (!isOwnerOrAdmin) {
      return res.status(403).json({ error: '只有管理员可以修改群组设置' });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (settings) {
      group.settings = { ...group.settings, ...settings };
    }

    group.lastActivity = new Date();
    await group.save();

    await group.populate('members.user', 'username email avatar status');

    res.json({
      message: '群组更新成功',
      group
    });
  } catch (error) {
    console.error('更新群组错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '只有群组所有者可以删除群组' });
    }

    await Promise.all([
      Group.findByIdAndDelete(groupId),
      Message.deleteMany({ group: groupId })
    ]);

    res.json({ message: '群组删除成功' });
  } catch (error) {
    console.error('删除群组错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;