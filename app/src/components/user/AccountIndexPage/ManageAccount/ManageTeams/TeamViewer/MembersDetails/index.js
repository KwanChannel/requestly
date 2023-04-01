import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Col, Row, Button, Typography } from "antd";
import { getAvailableTeams } from "store/features/teams/selectors";
import TeamMembersTable from "./TeamMembersTable";
import { getFunctions, httpsCallable } from "firebase/functions";
import { PlusOutlined } from "@ant-design/icons";
import AddMemberModal from "./AddMemberModal";
import { trackAddMemberClicked } from "modules/analytics/events/common/teams";
import PublicInviteLink from "./PublicInviteLink";
import "./MembersDetails.css";

const MembersDetails = ({ teamId, isTeamAdmin }) => {
  const location = useLocation();
  const isNewTeam = location.state?.isNewTeam;

  // Component state
  const [seats, setSeats] = useState({});
  const [showSeatStatus, setShowSeatStatus] = useState(false);
  const [isAddMemberModalActive, setIsAddMemberModalActive] = useState(false);
  const [refreshTeamMembersTable, setRefreshTeamMembersTable] = useState(false);

  // Global state
  const availableTeams = useSelector(getAvailableTeams);
  const teamDetails = availableTeams?.find((team) => team.id === teamId) ?? {};
  const accessCount = teamDetails?.accessCount;

  // To handle refresh in TeamMembersTable
  const doRefreshTeamMembersTable = () => {
    setRefreshTeamMembersTable(!refreshTeamMembersTable);
  };

  const toggleAddMemberModal = () => {
    setIsAddMemberModalActive(!isAddMemberModalActive);
  };

  const handleAddMemberClick = () => {
    setIsAddMemberModalActive(true);
    trackAddMemberClicked();
  };

  useEffect(() => {
    if (isNewTeam) {
      setIsAddMemberModalActive(true);
    }
  }, [isNewTeam]);

  useEffect(() => {
    const functions = getFunctions();
    const getTeamBillingUsers = httpsCallable(functions, "getTeamBillingUsers");

    getTeamBillingUsers({
      teamId,
    })
      .then((res) => {
        const seatsData = res.data;
        if (seatsData.success) {
          setSeats({
            billQuantity: seatsData.billQuantity, // quantity passed to stripe to bill
            actualBillQuantity: seatsData.actualBillQuantity, // total number of users
          });
          setShowSeatStatus(true);
        }
      })
      .catch(() => setShowSeatStatus(false));
  }, [teamId, refreshTeamMembersTable]);

  return (
    <div className="members-details-container">
      <PublicInviteLink teamId={teamId} />

      {/* members table */}
      <Row justify="space-between" align="bottom">
        <Col>
          <div className="title members-details-title">
            {accessCount > 1 ? `${accessCount} Members` : "Workspace Members"}
          </div>
        </Col>
        <Col>
          <Button
            disabled={!isTeamAdmin}
            type="primary"
            onClick={handleAddMemberClick}
          >
            <PlusOutlined />{" "}
            <span className="text-bold caption">Invite People</span>
          </Button>
        </Col>
      </Row>

      <div className="members-table-container">
        <TeamMembersTable
          teamId={teamId}
          isTeamAdmin={isTeamAdmin}
          refresh={refreshTeamMembersTable}
          callback={doRefreshTeamMembersTable}
        />

        {isTeamAdmin && (
          <>
            {accessCount === 1 ? (
              <p className="members-invite-message">
                You are the only member in this workspace, add more members to
                collaborate.
              </p>
            ) : 1 < accessCount && accessCount <= 3 ? (
              <p className="members-invite-message">
                There are only a few members in this workspace, add more members
                to collaborate.
              </p>
            ) : null}
          </>
        )}
      </div>

      <Row align="middle" justify="center" className="members-quantity-info">
        {showSeatStatus ? (
          <Typography.Text
            strong
            className="text-sm text-dark-gray text-center"
          >
            {`You currently have ${seats.actualBillQuantity} active users. Feel free to add more.`}
          </Typography.Text>
        ) : null}
      </Row>

      {isAddMemberModalActive ? (
        <AddMemberModal
          teamId={teamId}
          isOpen={isAddMemberModalActive}
          handleModalClose={toggleAddMemberModal}
          callback={doRefreshTeamMembersTable}
        />
      ) : null}
    </div>
  );
};

export default MembersDetails;
