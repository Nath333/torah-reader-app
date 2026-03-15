/**
 * TopicsTab - Sefaria topic connections
 */
import React, { useState, useCallback } from 'react';
import { getTopicDetails } from '../../services/scholarlyApiService';

const TopicItem = React.memo(({ topic, onSelect }) => (
  <div className="topic-item" onClick={() => onSelect(topic)}>
    <span className="topic-title">{topic.title?.en || topic.slug}</span>
    {topic.title?.he && (
      <span className="topic-title-hebrew" dir="rtl">{topic.title.he}</span>
    )}
    {topic.category && (
      <span className="topic-category">{topic.category}</span>
    )}
  </div>
));

const TopicsTab = React.memo(({ topics }) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicDetails, setTopicDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelectTopic = useCallback(async (topic) => {
    setSelectedTopic(topic);
    setLoading(true);
    try {
      const details = await getTopicDetails(topic.slug);
      setTopicDetails(details);
    } catch (error) {
      console.error('Failed to fetch topic details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedTopic(null);
    setTopicDetails(null);
  }, []);

  if (!topics || topics.length === 0) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">🏷️</span>
        <span className="empty-text">No topic connections found</span>
      </div>
    );
  }

  // Show topic details
  if (selectedTopic) {
    return (
      <div className="topic-details">
        <button className="back-button" onClick={handleBack}>
          ← Back to topics
        </button>

        <h4 className="topic-details-title">
          {topicDetails?.primaryTitle?.en || selectedTopic.title?.en || selectedTopic.slug}
        </h4>

        {loading ? (
          <div className="loading-indicator">Loading...</div>
        ) : topicDetails ? (
          <>
            {topicDetails.description?.en && (
              <p className="topic-description">{topicDetails.description.en}</p>
            )}

            {topicDetails.numSources > 0 && (
              <div className="topic-sources-count">
                {topicDetails.numSources} related sources in Sefaria
              </div>
            )}

            {topicDetails.relatedTopics?.length > 0 && (
              <div className="related-topics">
                <h5>Related Topics</h5>
                <div className="related-topics-list">
                  {topicDetails.relatedTopics.slice(0, 10).map((rt, i) => (
                    <span key={i} className="related-topic-tag">
                      {rt.title?.en || rt.slug}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="topic-no-details">No additional details available</p>
        )}
      </div>
    );
  }

  // Show topic list
  return (
    <div className="topics-tab">
      <div className="topics-header">
        <span className="topics-count">{topics.length} connected topics</span>
      </div>
      <div className="topics-list">
        {topics.map((topic, index) => (
          <TopicItem key={index} topic={topic} onSelect={handleSelectTopic} />
        ))}
      </div>
    </div>
  );
});

export default TopicsTab;
