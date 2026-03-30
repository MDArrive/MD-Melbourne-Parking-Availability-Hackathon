import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-regular-svg-icons';

const ParkingAvailability = () => {
  const [showIntroAlert, setShowIntroAlert] = useState(true);

  return (
    <React.Fragment>
      <Helmet title="Car Park Availability Exercise" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3">Car Park Availability Exercise</h1>

        {showIntroAlert && (
          <Alert
            variant="primary"
            className="alert-outline"
            onClose={() => setShowIntroAlert(false)}
            dismissible
          >
            <div className="alert-icon">
              <FontAwesomeIcon icon={faBell} fixedWidth />
            </div>
            <div className="alert-message">
              <strong>Welcome to the Car Park Availability Exercise!</strong>
              <p className="mb-2">
                Your goal is to build a full-stack car park availability system from scratch.
                The car park has multiple zones (e.g. A, B, C), each with a number of parking bays.
                Users should be able to see which bays are available, book a bay, and release it.
              </p>
              <p className="mb-2">
                There is <strong>no backend or database set up for this exercise yet</strong> — you
                will build everything using AI assistance. Use Exercise 1 (Task List) as a reference
                for the patterns used in this codebase.
              </p>
              <p className="mb-1">
                Work through the following tasks in order:
              </p>
              <ul>
                <li>
                  <strong>Task 1: Database Model.</strong> Design and create a Prisma schema for
                  parking zones and bays (each bay has a zone, a bay number, and a status such as
                  available/occupied). Create the migration and seed the database with sample data
                  (e.g. 3 zones with 10 bays each).
                </li>
                <li>
                  <strong>Task 2: Backend API.</strong> Create API endpoints to: retrieve all zones
                  with their bay counts and availability; retrieve bays for a specific zone; book a
                  bay (mark as occupied); and release a bay (mark as available).
                </li>
                <li>
                  <strong>Task 3: Availability Dashboard.</strong> Build the frontend UI on this page.
                  Display each zone as a card showing the zone name, total bays, and how many are
                  available. Use colour coding to indicate availability (e.g. green for mostly free,
                  amber for filling up, red for nearly full).
                </li>
                <li>
                  <strong>Task 4: Bay Management.</strong> Allow users to click into a zone to see
                  individual bays. Each bay should show its status and have a button to book or
                  release it.
                </li>
              </ul>
            </div>
          </Alert>
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
