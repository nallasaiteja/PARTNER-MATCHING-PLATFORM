import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getPublicSuccessStories,
  SuccessStoryPublicItem,
} from '../services/successStoriesApi';
import { SEOHead } from '../components/SEOHead';
import './SuccessStoriesPage.css';

export const SuccessStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<SuccessStoryPublicItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    // SEO Page Title & Meta Tags
    document.title = 'Success Stories & Happy Couples | Partner Matching Platform';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Discover inspiring true love and marriage success stories from verified couples who found their perfect life partners on Partner Matching Platform.',
    );
  }, []);

  const loadStories = async (targetPage = 1, searchQuery = search) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPublicSuccessStories(targetPage, 9, searchQuery);
      setStories(res.stories || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
      setPage(res.page || 1);
    } catch (err: any) {
      setError(err.message || 'Unable to load success stories at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories(page, search);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStories(1, search);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getYouTubeEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  return (
    <div className="success-stories-page">
      <SEOHead
        title="Happy Couple Success Stories & Marriages"
        description="Discover inspiring true love and marriage success stories from verified couples who found their perfect life partners on Partner Matching Platform."
        canonicalPath="/success-stories"
        keywords="success stories, matrimony couples, wedding testimonials, married couples, partner matching reviews"
      />
      {/* Public Navigation Bar */}
      <header className="public-navbar">
        <div className="navbar-content">
          <Link to="/" className="brand-logo">
            💍 Partner Matching Platform
          </Link>
          <nav className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/success-stories" className="active-nav">
              Success Stories
            </Link>
            <Link to="/admin/dashboard" className="staff-link">
              Admin Portal
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="stories-hero">
        <div className="hero-overlay">
          <span className="hero-pill">❤️ Celebrations of Love</span>
          <h1>Real Couples, Real Happily Ever Afters</h1>
          <p>
            Explore real wedding stories from members who found their soulmate through our verified Telugu matchmaking platform.
          </p>

          <form onSubmit={handleSearchSubmit} className="stories-search-bar">
            <input
              type="text"
              placeholder="Search by couple name or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="search-btn">
              🔍 Search
            </button>
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearch('');
                  loadStories(1, '');
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="stories-container">
        <div className="stories-header-meta">
          <h2>
            Verified Couple Stories{' '}
            <span className="count-badge">({totalCount})</span>
          </h2>
          <p className="subtitle">
            All stories are verified and approved for public inspiration with mutual couple consent.
          </p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading heartwarming stories...</p>
          </div>
        ) : error ? (
          <div className="error-card">
            <p>⚠️ {error}</p>
            <button onClick={() => loadStories(page, search)} className="retry-btn">
              Try Again
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💐</div>
            <h3>No Success Stories Found</h3>
            <p>
              {search
                ? `No stories matched your search "${search}". Try searching with another name.`
                : 'Stay tuned! New verified member success stories are currently being featured.'}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  loadStories(1, '');
                }}
                className="reset-btn"
              >
                View All Stories
              </button>
            )}
          </div>
        ) : (
          <div className="stories-grid">
            {stories.map((story) => {
              const primaryPhoto =
                story.couplePhotos && story.couplePhotos.length > 0
                  ? story.couplePhotos[0]
                  : '/placeholder-couple.jpg';
              const embedUrl = getYouTubeEmbedUrl(story.youtubeVideoUrl);

              return (
                <article key={story.id} className="story-card">
                  {/* Photo Thumbnail */}
                  <div className="card-media-wrapper">
                    <img
                      src={primaryPhoto}
                      alt={`${story.partner1Name || 'Partner 1'} and ${story.partner2Name || 'Partner 2'}`}
                      className="card-photo"
                      onClick={() => setSelectedPhoto(primaryPhoto)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="media-badge-group">
                      {story.couplePhotos && story.couplePhotos.length > 1 && (
                        <span className="photo-count-badge">
                          📷 {story.couplePhotos.length} Photos
                        </span>
                      )}
                      {embedUrl && (
                        <button
                          type="button"
                          className="video-pill-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideo(embedUrl);
                          }}
                        >
                          ▶ Video
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="card-body">
                    <div className="couple-names-header">
                      <span className="heart-icon">💖</span>
                      <h3 className="couple-names">
                        {story.partner1Name || 'Partner 1'} &amp;{' '}
                        {story.partner2Name || 'Partner 2'}
                      </h3>
                    </div>

                    {story.title && <h4 className="story-title">{story.title}</h4>}

                    <div className="dates-row">
                      <div className="date-item marriage-date">
                        <span className="date-icon">💒</span>
                        <div>
                          <span className="date-label">Married On</span>
                          <strong className="date-value">{formatDate(story.marriageDate)}</strong>
                        </div>
                      </div>

                      {story.engagementDate && (
                        <div className="date-item engagement-date">
                          <span className="date-icon">💍</span>
                          <div>
                            <span className="date-label">Engaged</span>
                            <strong className="date-value">
                              {formatDate(story.engagementDate)}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {story.story && (
                      <p className="story-snippet">
                        “{story.story.length > 220 ? `${story.story.slice(0, 220)}...` : story.story}”
                      </p>
                    )}

                    {/* Secondary Photos Row */}
                    {story.couplePhotos && story.couplePhotos.length > 1 && (
                      <div className="thumbnail-strip">
                        {story.couplePhotos.slice(0, 4).map((imgUrl, idx) => (
                          <img
                            key={idx}
                            src={imgUrl}
                            alt={`Couple snapshot ${idx + 1}`}
                            className="thumb-mini"
                            onClick={() => setSelectedPhoto(imgUrl)}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="page-btn"
            >
              ← Previous
            </button>
            <span className="page-indicator">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="page-btn"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="modal-backdrop" onClick={() => setSelectedVideo(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedVideo(null)}>
              ✕
            </button>
            <div className="iframe-container">
              <iframe
                src={selectedVideo}
                title="Couple Success Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="modal-backdrop" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedPhoto(null)}>
              ✕
            </button>
            <img src={selectedPhoto} alt="Full Couple View" className="full-preview-img" />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="public-footer">
        <p>&copy; {new Date().getFullYear()} Partner Matching Platform. Bringing Telugu souls together worldwide.</p>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/success-stories">Success Stories</Link>
        </div>
      </footer>
    </div>
  );
};

export default SuccessStoriesPage;
