import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Row, Col, Alert, Card } from 'react-bootstrap';
import { Copy } from 'lucide-react';

const promptBlockStyle: React.CSSProperties = {
  background: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '6px',
  padding: '10px 14px',
  fontSize: '0.9rem',
  lineHeight: '1.5',
  cursor: 'pointer',
};

const CopyablePrompt = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={promptBlockStyle} onClick={handleCopy} title="Click to copy">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <span>{children}</span>
        <span className="text-muted flex-shrink-0" style={{ fontSize: '0.75rem' }}>
          {copied ? 'Copied!' : <Copy size={14} />}
        </span>
      </div>
    </div>
  );
};

const AnalyticsChartExercise = () => {
  const [showIntroAlert, setShowIntroAlert] = useState(true);

  return (
    <React.Fragment>
      <Helmet title="Analytics Chart Exercise" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3">Analytics Chart Exercise</h1>

        {showIntroAlert && (
          <Card className="mb-4 border-primary">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="mb-2">Analytics Chart Exercise</h5>
                  <p className="mb-2">
                    Your goal is to display the company's monthly website analytics data as a chart
                    on this page. The data already exists in the backend — you need to find it and
                    visualise it.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowIntroAlert(false)}
                />
              </div>

              <div className="rounded p-3 mb-3" style={{ background: '#d1e7dd' }}>
                <strong>How it works:</strong> Copy each task below (click the block to copy) and
                paste it into Claude. After each task, refresh this page to see your changes.
              </div>

              <h6 className="mb-3">Tasks</h6>

              <div className="mb-3">
                <div className="fw-semibold mb-1">1. Find the Data</div>
                <CopyablePrompt>Look at the backend code in this project and find the API endpoint that serves monthly analytics data. Tell me what endpoint it is and what data it returns.</CopyablePrompt>
              </div>

              <div className="mb-0">
                <div className="fw-semibold mb-1">2. Build the Chart</div>
                <CopyablePrompt>On the AnalyticsChart page (frontend/src/pages/exercises/analytics/AnalyticsChart.tsx), fetch the monthly analytics data from the backend API endpoint you found. Choose an appropriate charting library, install it, and display the data as a line chart showing Page Views and Total Visits over time. Make it look good.</CopyablePrompt>
              </div>

              <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.85rem' }}>
                <strong>Tip:</strong> The first task is deliberately vague — part of the exercise is
                seeing how Claude can explore the codebase to find things for you.
              </p>
            </Card.Body>
          </Card>
        )}

        <Row>
          <Col>
            <Card>
              <Card.Header>
                <Card.Title>Monthly Analytics Chart</Card.Title>
                <h6 className="card-subtitle text-muted">Display the fetched monthly analytics data here.</h6>
              </Card.Header>
              <Card.Body>
                <div className="text-center text-muted py-4">
                  Chart placeholder — complete the tasks above to build this feature.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </React.Fragment>
  );
};

export default AnalyticsChartExercise;
