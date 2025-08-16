/**
 * Comments Controller - Manages employee comments and feedback system
 * Handles CRUD operations for employee-specific comments and notes
 */
module.exports = {
  // Get all comments for a specific employee
  getCommentsByEmployeeId: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const [comments] = await req.db.query(
        'SELECT * FROM employee_comments WHERE employee_id = ? ORDER BY created_at DESC', 
        [employeeId]
      );
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  },

  // Add a new comment for an employee
  addComment: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { comment, created_by } = req.body;

      if (!comment || !comment.trim()) {
        return res.status(400).json({ error: 'Comment is required' });
      }

      const [result] = await req.db.query(
        'INSERT INTO employee_comments (employee_id, comment, created_by) VALUES (?, ?, ?)',
        [employeeId, comment.trim(), created_by || 'HR']
      );

      // Fetch the newly created comment
      const [newComment] = await req.db.query(
        'SELECT * FROM employee_comments WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json(newComment[0]);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  },

  // Update a comment
  updateComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { comment } = req.body;

      if (!comment || !comment.trim()) {
        return res.status(400).json({ error: 'Comment is required' });
      }

      const [result] = await req.db.query(
        'UPDATE employee_comments SET comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [comment.trim(), commentId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Fetch the updated comment
      const [updatedComment] = await req.db.query(
        'SELECT * FROM employee_comments WHERE id = ?',
        [commentId]
      );

      res.json(updatedComment[0]);
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ error: 'Failed to update comment' });
    }
  },

  // Delete a comment
  deleteComment: async (req, res) => {
    try {
      const { commentId } = req.params;

      const [result] = await req.db.query(
        'DELETE FROM employee_comments WHERE id = ?',
        [commentId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
};
