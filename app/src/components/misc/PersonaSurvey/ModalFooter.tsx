import React, { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getUserPersonaSurveyDetails, getAppMode } from "store/selectors";
import { actions } from "store";
import { Col, Row } from "antd";
import { RQButton } from "lib/design-system/components";
import { OptionsConfig, SurveyConfig } from "./config";
import { handleSurveyNavigation } from "./actions";
import { submitAttrUtil } from "utils/AnalyticsUtils";
import { QuestionnaireType, SurveyPage } from "./types";
//@ts-ignore
import { CONSTANTS as GLOBAL_CONSTANTS } from "@requestly/requestly-core";
import PATHS from "config/constants/sub/paths";
import APP_CONSTANTS from "config/constants";
import { trackPersonaQ1Completed } from "modules/analytics/events/misc/personaSurvey";
import "./index.css";

interface FooterProps {
  currentPage: SurveyPage;
  callback: () => void;
  isSurveyModal: boolean;
}

export const SurveyModalFooter: React.FC<FooterProps> = ({ currentPage, callback, isSurveyModal }) => {
  const dispatch = useDispatch();
  const userPersona = useSelector(getUserPersonaSurveyDetails);
  const appMode = useSelector(getAppMode);
  const currentQuestionnaire = SurveyConfig[currentPage]?.render;
  const isSharedListUser = window.location.href.includes(PATHS.SHARED_LISTS.VIEWER.RELATIVE);
  const surveyLength = useMemo(() => Object.keys(SurveyConfig).length, []);

  const disableContinue = useMemo(() => {
    if (currentPage === SurveyPage.GETTING_STARTED) return false;
    if (userPersona[OptionsConfig[currentQuestionnaire as QuestionnaireType]?.key]?.length) return false;
    return true;
  }, [currentPage, currentQuestionnaire, userPersona]);

  const handleMoveToNextPage = () => {
    const index = Object.keys(SurveyConfig).indexOf(currentPage);

    switch (currentQuestionnaire) {
      case QuestionnaireType.PERSONA:
        trackPersonaQ1Completed(userPersona.persona);
        submitAttrUtil(APP_CONSTANTS.GA_EVENTS.ATTR.PERSONA, userPersona.persona);
        break;
    }
    if (isSurveyModal || index !== surveyLength - 1) {
      handleSurveyNavigation(currentPage, dispatch);

      if (isSurveyModal && index === surveyLength - 1) {
        if (isSharedListUser || appMode === GLOBAL_CONSTANTS.APP_MODES.DESKTOP) {
          //don’t show recommendation screen for shared list users or desktop users
          dispatch(actions.updateIsPersonaSurveyCompleted(true));
          return;
        }
        dispatch(actions.toggleActiveModal({ modalName: "personaSurveyModal", newValue: false }));
      }
    } else {
      callback?.();
    }
  };

  return (
    <>
      <div className="survey-footer w-full">
        <Row justify="space-between" align="middle">
          <Col>
            {isSurveyModal && currentPage === SurveyPage.GETTING_STARTED ? (
              <>
                <span className="survey-modal-emoji">😁</span> We are excited to see you here
              </>
            ) : (
              <>
                {Object.keys(SurveyConfig).indexOf(currentPage)} / {surveyLength - 1}
              </>
            )}
          </Col>
          <Col>
            <RQButton
              type="primary"
              className={`text-bold ${disableContinue && "survey-disable-continue"}`}
              onClick={handleMoveToNextPage}
            >
              {currentQuestionnaire === QuestionnaireType.PERSONA ? "Get started" : "Continue"}
            </RQButton>
          </Col>
        </Row>
      </div>
    </>
  );
};
