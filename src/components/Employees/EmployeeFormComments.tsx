import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Save, X } from 'lucide-react';

interface Comment {
  id: number;
  employee_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeFormCommentsProps {
  employeeId?: string;
  viewOnly?: boolean;
}

const EmployeeFormComments: React.FC<EmployeeFormCommentsProps> = ({
  employeeId,
  viewOnly = false,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  };

  const fetchComments = async () => {
    if (!employeeId) return;
    
    try {
      const response = await fetch(`/api/comments/employee/${employeeId}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        console.error('Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !employeeId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/comments/employee/${employeeId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          comment: newComment.trim(),
          created_by: 'HR', // You can get this from user context
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments([newCommentData, ...comments]);
        setNewComment('');
        setIsAddingComment(false);
        showMessage('Comment added successfully!');
      } else {
        showMessage('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showMessage('Error adding comment');
    } finally {
      setLoading(false);
    }
  };

  const updateComment = async (commentId: number) => {
    if (!editText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          comment: editText.trim(),
        }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        setComments(
          comments.map((c) =>
            c.id === commentId ? updatedComment : c
          )
        );
        setEditingComment(null);
        setEditText('');
        showMessage('Comment updated successfully!');
      } else {
        showMessage('Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      showMessage('Error updating comment');
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
        showMessage('Comment deleted successfully!');
      } else {
        showMessage('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showMessage('Error deleting comment');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditText(comment.comment);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  const cancelAdd = () => {
    setIsAddingComment(false);
    setNewComment('');
  };

  useEffect(() => {
    if (employeeId) {
      fetchComments();
    }
  }, [employeeId]);

  return (
    <div className="w-full">
      {/* Message */}
      {message && (
        <div className="mb-4 px-4 py-2 bg-green-100 border border-green-300 text-green-700 text-center rounded">
          {message}
        </div>
      )}

      {/* Add New Comment Section */}
      {!viewOnly && (
        <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-blue-50">
          {!isAddingComment ? (
            <button
              onClick={() => setIsAddingComment(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Comment
            </button>
          ) : (
            <div>
              <div className="flex items-center mb-2">
                <Plus className="w-4 h-4 mr-2 text-blue-500" />
                <span className="font-medium text-gray-800">Add New Comment</span>
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Enter your comment here..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-3"
                rows={3}
              />
              <div className="flex space-x-2">
                <button
                  onClick={addComment}
                  disabled={loading || !newComment.trim()}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {loading ? 'Saving...' : 'Save Comment'}
                </button>
                <button
                  onClick={cancelAdd}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm">No comments yet.</p>
            {!viewOnly && (
              <p className="text-xs text-gray-400 mt-1">Add the first comment using the button above.</p>
            )}
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editingComment === comment.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateComment(comment.id)}
                          disabled={loading || !editText.trim()}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm flex items-center"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm flex items-center"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-800 mb-3 whitespace-pre-wrap leading-relaxed">
                        {comment.comment}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span>
                          Created by: {comment.created_by}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(comment.created_at)}
                        </span>
                        {comment.created_at !== comment.updated_at && (
                          <span className="text-orange-500">
                            (Updated: {formatDate(comment.updated_at)})
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {!viewOnly && editingComment !== comment.id && (
                  <div className="flex space-x-1 ml-3">
                    <button
                      onClick={() => startEdit(comment)}
                      className="p-1 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                      title="Edit comment"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comments count */}
      {comments.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default EmployeeFormComments;
