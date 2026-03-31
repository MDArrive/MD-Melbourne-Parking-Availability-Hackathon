import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-regular-svg-icons';
import { Copy } from 'lucide-react';

const promptBlockStyle: React.CSSProperties = {
  background: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '6px',
  padding: '10px 14px',
  fontSize: '0.9rem',
  lineHeight: '1.5',
  cursor: 'pointer',
  position: 'relative',
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

const ParkingAvailability = () => {
  const [showIntroAlert, setShowIntroAlert] = useState(true);

  return (
    <React.Fragment>
      <Helmet title="Car Park Availability Exercise" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3">Car Park Availability Exercise</h1>

        {showIntroAlert && (
          <Card className="mb-4 border-primary">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="mb-2">Welcome to the Car Park Availability Exercise!</h5>
                  <p className="mb-2">
                    You are going to build a complete car park availability system from scratch —
                    database, API, and user interface. There is <strong>nothing set up yet</strong>.
                    Claude will build everything for you.
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
                paste it into Claude. Wait for Claude to finish, then move to the next task.
                After tasks 3 and 4, refresh this page to see your changes.
              </div>

              <h6 className="mb-3">Tasks</h6>

              <div className="mb-3">
                <div className="fw-semibold mb-1">1. Database Model</div>
                <CopyablePrompt>Create a database model for a car park system. I need a ParkingZone table (with name and description) and a ParkingBay table (with bay number and status of either AVAILABLE or OCCUPIED, linked to a zone). Create the Prisma schema, run the migration, and seed the database with 3 zones: Zone A (10 bays), Zone B (8 bays), Zone C (12 bays). All bays should start as AVAILABLE. Follow the same patterns as the existing ExampleTask model.</CopyablePrompt>
              </div>

              <div className="mb-3">
                <div className="fw-semibold mb-1">2. Backend API</div>
                <CopyablePrompt>Create backend API endpoints for the car park system. I need: GET /api/parking to list all zones with their total bays and available bays count; GET /api/parking/:zoneId/bays to list all bays in a zone; POST /api/parking/:zoneId/bays/:bayId/book to mark a bay as occupied; POST /api/parking/:zoneId/bays/:bayId/release to mark a bay as available. Follow the same repository/service/controller/routes pattern as the existing exercise task API. Mount the routes in app.ts.</CopyablePrompt>
              </div>

              <div className="mb-3">
                <div className="fw-semibold mb-1">3. Availability Dashboard</div>
                <CopyablePrompt>Build the frontend UI for the car park availability dashboard on the ParkingAvailability page (frontend/src/pages/exercises/parking/ParkingAvailability.tsx). Fetch zones from GET /api/parking and display each zone as a card showing the zone name, how many bays are available out of the total, and a progress bar. Colour-code the cards: green if more than 50% available, amber if 20-50% available, red if less than 20% available. Use the same patterns as ExerciseTaskList.tsx.</CopyablePrompt>
              </div>

              <div className="mb-3">
                <div className="fw-semibold mb-1">4. Bay Management</div>
                <CopyablePrompt>Add bay management to the car park page. When a user clicks on a zone card, show the individual bays for that zone. Display each bay with its number, a colour indicator (green for available, red for occupied), and a button to book or release it. Add a "Back to zones" button. When a bay is booked or released, update the display. Use the existing API endpoints.</CopyablePrompt>
              </div>

              <hr />

              <h6 className="mb-3">Bonus Challenges</h6>

              <div className="mb-3">
                <div className="fw-semibold mb-1">5. Visual Bay Map</div>
                <CopyablePrompt>Replace the bay list with a visual car park map. Render bays as coloured squares arranged in two rows facing a central driving lane, like a real car park from above. Green squares for available, red for occupied. Click a square to book or release it.</CopyablePrompt>
              </div>

              <div className="mb-3">
                <div className="fw-semibold mb-1">6. Live Updates</div>
                <CopyablePrompt>Add live polling so the car park dashboard automatically refreshes every 5 seconds without needing to reload the page. This way multiple users can see each other's bookings appear in real time. Show a "Last updated" timestamp.</CopyablePrompt>
              </div>

              <div className="mb-0">
                <div className="fw-semibold mb-1">7. Booking Details</div>
                <CopyablePrompt>When booking a bay, show a popup form asking for the driver's name and vehicle registration number. Display this information on occupied bays. Add a search bar at the top of the page that lets you search for a vehicle by name or registration across all zones.</CopyablePrompt>
              </div>
            </Card.Body>
          </Card>
        )}

        <Row>
          <Col>
            <Card>
              <Card.Header>
                <Card.Title>Car Park Overview</Card.Title>
                <h6 className="card-subtitle text-muted">
                  Zone availability will be displayed here.
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="text-center text-muted py-4">
                  No data yet — complete the tasks above to build this feature.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </React.Fragment>
  );
};

export default ParkingAvailability;
