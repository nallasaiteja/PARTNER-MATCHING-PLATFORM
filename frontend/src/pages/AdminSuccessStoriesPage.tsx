import React, { useState, useEffect } from 'react';
import {
  getAdminSuccessStories,
  createSuccessStory,
  updateSuccessStory,
  togglePublishSuccessStory,
  deleteSuccessStory,
  uploadSuccessStoryPhoto,
  SuccessStoryAdminItem,
} from '../services/successStoriesApi';
import './AdminSuccessStoriesPage.css';

export const AdminSuccessStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<SuccessStoryAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    partner1MemberId: '',
    partner2MemberId: '',
    partner1Name: '',
    partner2Name: '',
    title: '',
    story: '',
    engagementDate: '',
    marriageDate: '',
    youtubeVideoUrl: '',
    isPublished: true,
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadStories = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminSuccessStories(targetPage, 15, statusFilter, search);
      setStories(res.stories || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
      setPage(res.page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories(page);
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStories(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      partner1MemberId: '',
      partner2MemberId: '',
      partner1Name: '',
      partner2Name: '',
      title: '',
      story: '',
      engagementDate: '',
      marriageDate: '',
      youtubeVideoUrl: '',
      isPublished: true,
    });
    setPhotoUrls([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (story: SuccessStoryAdminItem) => {
    setEditingId(story.id);
    setFormData({
      partner1MemberId: story.partner1MemberId,
      partner2MemberId: story.partner2MemberId,
      partner1Name: story.partner1Name || '',
      partner2Name: story.partner2Name || '',
      title: story.title || '',
      story: story.story || '',
      engagementDate: story.engagementDate ? story.engagementDate.slice(0, 10) : '',
      marriageDate: story.marriageDate ? story.marriageDate.slice(0, 10) : '',
      youtubeVideoUrl: story.youtubeVideoUrl || '',
      isPublished: story.isPublished,
    });
    setPhotoUrls(story.couplePhotos || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setUploadingPhoto(true);
      setFormError(null);
      const res = await uploadSuccessStoryPhoto(file);
      setPhotoUrls((prev) => [...prev, res.url]);
    } catch (err: any) {
      setFormError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partner1MemberId.trim() || !formData.partner2MemberId.trim()) {
      setFormError('Both Partner 1 and Partner 2 Member IDs are required.');
      return;
    }
    if (!formData.marriageDate) {
      setFormError('Marriage date is required.');
      return;
    }
    if (photoUrls.length === 0) {
      setFormError('Please upload at least one couple photo.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload = {
        partner1MemberId: formData.partner1MemberId.trim(),
        partner2MemberId: formData.partner2MemberId.trim(),
        partner1Name: formData.partner1Name.trim() || undefined,
        partner2Name: formData.partner2Name.trim() || undefined,
        title: formData.title.trim() || undefined,
        story: formData.story.trim() || undefined,
        engagementDate: formData.engagementDate ? formData.engagementDate : undefined,
        marriageDate: formData.marriageDate,
        couplePhotos: photoUrls,
        youtubeVideoUrl: formData.youtubeVideoUrl.trim() || undefined,
        isPublished: formData.isPublished,
      };

      if (editingId) {
        await updateSuccessStory(editingId, payload);
      } else {
        await createSuccessStory(payload);
      }

      setIsModalOpen(false);
      loadStories(page);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save success story');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTogglePublish = async (story: SuccessStoryAdminItem) => {
    try {
      await togglePublishSuccessStory(story.id, !story.isPublished);
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, isPublished: !s.isPublished } : s)),
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this success story?')) return;
    try {
      await deleteSuccessStory(id);
      loadStories(page);
    } catch (err: any) {
      alert(err.message || 'Failed to delete story');
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
  };

  return (
    <div className="admin-success-stories-page">
      {/* Header Bar */}
      <div className="admin-page-header">
        <div>
          <h1>💖 Success Stories Management</h1>
          <p className="subtitle">
            Curate, verify, and publish real Telugu couple weddings on the public portal.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-add-story">
          ➕ Add New Success Story
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filters-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search by member ID, couple name, or story..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-filter-search">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn-filter-reset"
              onClick={() => {
                setSearch('');
                loadStories(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="status-filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Stories ({totalCount})</option>
            <option value="true">Published</option>
            <option value="false">Drafts / Unpublished</option>
          </select>
        </div>
      </div>

      {/* Content Table */}
      <div className="admin-table-card">
        {loading ? (
          <div className="table-loading">
            <div className="spinner"></div>
            <p>Loading stories...</p>
          </div>
        ) : error ? (
          <div className="table-error">
            <p>⚠️ {error}</p>
            <button onClick={() => loadStories(page)}>Retry</button>
          </div>
        ) : stories.length === 0 ? (
          <div className="table-empty">
            <p>No success stories found matching your filter.</p>
            <button onClick={openCreateModal} className="btn-secondary">
              Create First Success Story
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Couple Names &amp; Member IDs</th>
                  <th>Story Title</th>
                  <th>Marriage Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <tr key={story.id}>
                    <td className="photo-cell">
                      {story.couplePhotos && story.couplePhotos.length > 0 ? (
                        <img
                          src={story.couplePhotos[0]}
                          alt="Couple"
                          className="table-couple-thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=150&q=80';
                          }}
                        />
                      ) : (
                        <span className="no-photo-badge">No Photo</span>
                      )}
                    </td>
                    <td>
                      <div className="couple-names-cell">
                        <strong>
                          {story.partner1Name || 'Partner 1'} &amp;{' '}
                          {story.partner2Name || 'Partner 2'}
                        </strong>
                        <div className="member-ids-tag">
                          <span>ID 1: {story.partner1MemberId}</span>
                          <span>•</span>
                          <span>ID 2: {story.partner2MemberId}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="story-title-cell">
                        <strong>{story.title || 'Untitled'}</strong>
                        {story.youtubeVideoUrl && (
                          <span className="video-tag">▶ Video Linked</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="dates-cell">
                        <span>💒 {formatDate(story.marriageDate)}</span>
                        {story.engagementDate && (
                          <small>💍 Eng: {formatDate(story.engagementDate)}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          story.isPublished ? 'pill-published' : 'pill-draft'
                        }`}
                      >
                        {story.isPublished ? '● Published' : '○ Draft'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleTogglePublish(story)}
                        className="btn-action-status"
                        title={story.isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {story.isPublished ? 'Hide' : 'Publish'}
                      </button>
                      <button
                        onClick={() => openEditModal(story)}
                        className="btn-action-edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(story.id)}
                        className="btn-action-delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Success Story' : 'Add New Success Story'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-close">
                ✕
              </button>
            </div>

            {formError && <div className="modal-error-box">⚠️ {formError}</div>}

            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Partner 1 Member ID <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PMP-M-1002"
                    value={formData.partner1MemberId}
                    onChange={(e) =>
                      setFormData({ ...formData, partner1MemberId: e.target.value })
                    }
                    required
                  />
                  <small>Validated against active member database.</small>
                </div>

                <div className="form-group">
                  <label>
                    Partner 2 Member ID <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PMP-F-2005"
                    value={formData.partner2MemberId}
                    onChange={(e) =>
                      setFormData({ ...formData, partner2MemberId: e.target.value })
                    }
                    required
                  />
                  <small>Validated against active member database.</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Partner 1 Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-populated from member profile if blank"
                    value={formData.partner1Name}
                    onChange={(e) =>
                      setFormData({ ...formData, partner1Name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Partner 2 Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-populated from member profile if blank"
                    value={formData.partner2Name}
                    onChange={(e) =>
                      setFormData({ ...formData, partner2Name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    Marriage Date (Calendar) <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.marriageDate}
                    onChange={(e) =>
                      setFormData({ ...formData, marriageDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Engagement Date (Calendar, Optional)</label>
                  <input
                    type="date"
                    value={formData.engagementDate}
                    onChange={(e) =>
                      setFormData({ ...formData, engagementDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Story Headline / Title</label>
                <input
                  type="text"
                  placeholder="e.g. From First Chat to Wedding Bells: Suresh & Priya"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Success Story Narrative / Testimonial</label>
                <textarea
                  rows={4}
                  placeholder="Share their journey, how they connected, family blessings, and gratitude..."
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>YouTube Embed / Video URL (Section 11.6)</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtubeVideoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, youtubeVideoUrl: e.target.value })
                  }
                />
              </div>

              {/* Photos Upload & Gallery */}
              <div className="form-group">
                <label>
                  Couple Photos <span className="req">*</span>
                </label>
                <div className="photo-upload-row">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploadingPhoto}
                    id="couple-photo-input"
                    className="file-hidden-input"
                  />
                  <label
                    htmlFor="couple-photo-input"
                    className={`btn-upload-label ${uploadingPhoto ? 'disabled' : ''}`}
                  >
                    {uploadingPhoto ? 'Uploading...' : '📁 Upload Couple Photo'}
                  </label>
                  <small>Supports JPG, PNG, WEBP up to 5MB.</small>
                </div>

                {photoUrls.length > 0 && (
                  <div className="photo-preview-grid">
                    {photoUrls.map((url, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={url} alt={`Preview ${idx + 1}`} />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="btn-remove-photo"
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData({ ...formData, isPublished: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Publish Immediately</strong> (Visible on public portal)
                  </span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-modal-cancel"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? 'Saving...'
                    : editingId
                    ? 'Update Story'
                    : 'Save & Publish Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuccessStoriesPage;
