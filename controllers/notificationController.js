import { Notification, User, Poll } from "../models/index.js";

// @route GET /api/notifications  (latest notifications for the current user)
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { recipientId: req.userId },
      include: [
        { model: User, as: "actor", attributes: ["id", "name", "username", "avatar"] },
        { model: Poll, as: "poll", attributes: ["id", "question"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 30,
    });

    const unreadCount = await Notification.count({ where: { recipientId: req.userId, read: false } });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/notifications/read-all
export const markAllRead = async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { recipientId: req.userId, read: false } });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
