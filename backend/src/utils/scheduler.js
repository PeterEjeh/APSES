const db = require('../config/db');
const { sendNotification } = require('./notifications');

async function checkOverdueMilestones() {
  try {
    const [overdueList] = await db.query(
      `SELECT m.id, m.title, m.due_date, m.project_id, p.student_id, p.supervisor_id, p.title AS project_title
       FROM milestones m
       JOIN projects p ON m.project_id = p.id
       WHERE m.status IN ('pending', 'in_progress') AND m.due_date < CURDATE()`
    );

    for (const item of overdueList) {
      await db.query(
        `UPDATE milestones SET status = 'overdue' WHERE id = ?`,
        [item.id]
      );

      const alertMsg = `Milestone "${item.title}" for project "${item.project_title}" is past its due date (${new Date(item.due_date).toLocaleDateString()}) and is now marked OVERDUE.`;

      if (item.student_id) {
        await sendNotification(item.student_id, 'Milestone Overdue', alertMsg);
      }
      if (item.supervisor_id) {
        await sendNotification(item.supervisor_id, 'Student Milestone Overdue', alertMsg);
      }
    }

    return overdueList.length;
  } catch (err) {
    console.error('Error running overdue milestone check:', err.message);
    return 0;
  }
}

module.exports = { checkOverdueMilestones };
