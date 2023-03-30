import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import isEmpty from "is-empty";
import { Button, Col, Row } from "antd";
import { actions } from "../../../../../../app/src/store";
import Header from "./Header";
import Body from "./Body";
import ChangeRuleGroupModal from "../ChangeRuleGroupModal";
import SpinnerCard from "../../../misc/SpinnerCard";
import CreateSharedListModal from "../../../../components/features/sharedLists/CreateSharedListModal";
import APP_CONSTANTS from "../../../../config/constants";
import { CONSTANTS as GLOBAL_CONSTANTS } from "@requestly/requestly-core";
import { AUTH } from "modules/analytics/events/common/constants";
import { StorageService } from "../../../../init";
import {
  cleanup,
  getModeData,
  getSelectedRules,
  setCurrentlySelectedRule,
  initiateBlankCurrentlySelectedRule,
  setCurrentlySelectedRuleConfig,
} from "./actions";
import { fetchSharedLists } from "../../../../components/features/sharedLists/SharedListsIndexPage/actions";
import {
  getAppMode,
  getAllRules,
  getUserAuthDetails,
  getCurrentlySelectedRuleData,
  getCurrentlySelectedRuleConfig,
  getIsCurrentlySelectedRuleHasUnsavedChanges,
} from "../../../../store/selectors";
import * as RedirectionUtils from "../../../../utils/RedirectionUtils";
import useExternalRuleCreation from "./useExternalRuleCreation";
import Logger from "lib/logger";
import {
  trackRuleEditorViewed,
  trackDesktopRuleViewedOnExtension,
  trackDocsSidebarViewed,
} from "modules/analytics/events/common/rules";
import { isDesktopOnlyRule } from "utils/rules/misc";
import { ProductWalkthrough } from "components/misc/ProductWalkthrough";
import { ReactComponent as DownArrow } from "assets/icons/down-arrow.svg";
import Help from "./Help";
import "./RuleBuilder.css";

//CONSTANTS
const { RULE_EDITOR_CONFIG, RULE_TYPES_CONFIG } = APP_CONSTANTS;

const RuleBuilder = (props) => {
  //Constants
  const { MODE, RULE_TYPE_TO_CREATE, RULE_TO_EDIT_ID } = getModeData(
    props.location,
    props.isSharedListViewRule
  );
  const navigate = useNavigate();

  //Global State
  const { state } = useLocation();
  const dispatch = useDispatch();
  const currentlySelectedRuleData = useSelector(getCurrentlySelectedRuleData);
  const currentlySelectedRuleConfig = useSelector(
    getCurrentlySelectedRuleConfig
  );

  const isCurrentlySelectedRuleHasUnsavedChanges = useSelector(
    getIsCurrentlySelectedRuleHasUnsavedChanges
  );
  const allRules = useSelector(getAllRules);
  const appMode = useSelector(getAppMode);
  const user = useSelector(getUserAuthDetails);

  // TODO: use feature flag
  const __IS_FEATURE_FLAG_ON__ = false;
  const isRedirectRuleWithFeatureFlagOn =
    currentlySelectedRuleData.ruleType ===
      GLOBAL_CONSTANTS.RULE_TYPES.REDIRECT && __IS_FEATURE_FLAG_ON__;

  //References
  const isCleaningUpRef = useRef(false);
  //Component State
  const ruleSelection = {};
  ruleSelection[currentlySelectedRuleData.id] = true;

  const [isShareRulesModalActive, setIsShareRulesModalActive] = useState(false);
  const [fetchAllRulesComplete, setFetchAllRulesComplete] = useState(false);
  const [
    isChangeRuleGroupModalActive,
    setIsChangeRuleGroupModalActive,
  ] = useState(false);
  const [selectedRules, setSelectedRules] = useState(
    getSelectedRules(ruleSelection)
  );
  const [startWalkthrough, setStartWalkthrough] = useState(false);
  const [showDocs, setShowDocs] = useState(true);

  useExternalRuleCreation(MODE);

  const useHasChanged = (val) => {
    const prevVal = usePrevious(val);
    return prevVal !== val;
  };

  const usePrevious = (value) => {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const hasRuleToEditIdChanged = useHasChanged(RULE_TO_EDIT_ID);

  const toggleChangeRuleGroupModal = () => {
    setIsChangeRuleGroupModalActive(
      isChangeRuleGroupModalActive ? false : true
    );
  };
  const toggleShareRulesModal = () => {
    setIsShareRulesModalActive(isShareRulesModalActive ? false : true);
  };

  const shareRuleClickHandler = () => {
    if (user.loggedIn) {
      verifySharedListsLimit();
    } else {
      dispatch(
        actions.toggleActiveModal({
          modalName: "authModal",
          newValue: true,
          authMode: APP_CONSTANTS.AUTH.ACTION_LABELS.SIGN_UP,
          eventSource: AUTH.SOURCE.SHARE_RULES,
        })
      );
    }
  };

  const verifySharedListsLimit = () => {
    dispatch(
      actions.toggleActiveModal({
        modalName: "loadingModal",
        newValue: true,
      })
    );

    fetchSharedLists(user.details.profile.uid).then((result) => {
      //Create new shared list
      setSelectedRules(getSelectedRules(ruleSelection));
      setIsShareRulesModalActive(true);

      //Deactivate loading modal
      dispatch(
        actions.toggleActiveModal({
          modalName: "loadingModal",
          newValue: false,
        })
      );
    });
  };
  const stableSetCurrentlySelectedRuleConfig = useCallback(
    setCurrentlySelectedRuleConfig,
    [setCurrentlySelectedRuleConfig]
  );

  const stableSetCurrentlySelectedRule = useCallback(setCurrentlySelectedRule, [
    setCurrentlySelectedRule,
  ]);

  const stableInitiateBlankCurrentlySelectedRule = useCallback(
    initiateBlankCurrentlySelectedRule,
    [currentlySelectedRuleConfig]
  );

  const getRuleConfigInEditMode = (rule) => {
    if (rule.ruleType === GLOBAL_CONSTANTS.RULE_TYPES.HEADERS) {
      if (!rule.version) {
        return RULE_TYPES_CONFIG[GLOBAL_CONSTANTS.RULE_TYPES.HEADERS_V1];
      }
    }

    return RULE_TYPES_CONFIG[rule.ruleType];
  };

  useEffect(() => {
    if (
      currentlySelectedRuleData === false ||
      (MODE === RULE_EDITOR_CONFIG.MODES.CREATE &&
        currentlySelectedRuleData.ruleType !== RULE_TYPE_TO_CREATE) ||
      (MODE === RULE_EDITOR_CONFIG.MODES.CREATE &&
        currentlySelectedRuleConfig.TYPE !== RULE_TYPE_TO_CREATE) ||
      (MODE === RULE_EDITOR_CONFIG.MODES.CREATE &&
        currentlySelectedRuleConfig.TYPE !== currentlySelectedRuleData.ruleType)
    ) {
      if (MODE === RULE_EDITOR_CONFIG.MODES.CREATE) {
        stableInitiateBlankCurrentlySelectedRule(
          dispatch,
          currentlySelectedRuleConfig,
          RULE_TYPE_TO_CREATE,
          setCurrentlySelectedRule
        );
        stableSetCurrentlySelectedRuleConfig(
          dispatch,
          RULE_TYPES_CONFIG[RULE_TYPE_TO_CREATE],
          navigate
        );
      } else if (MODE === RULE_EDITOR_CONFIG.MODES.EDIT) {
        Logger.log("Reading to storage in RuleBuilder");
        StorageService(appMode)
          .getRecord(RULE_TO_EDIT_ID)
          .then((rule) => {
            if (rule === undefined) {
              RedirectionUtils.redirectTo404(navigate);
            } else {
              //Prevent updating state when component is about to unmount
              if (!isCleaningUpRef.current) {
                stableSetCurrentlySelectedRule(dispatch, rule);
                stableSetCurrentlySelectedRuleConfig(
                  dispatch,
                  getRuleConfigInEditMode(rule),
                  navigate
                );
              }
            }
          });
      } else if (MODE === RULE_EDITOR_CONFIG.MODES.SHARED_LIST_RULE_VIEW) {
        //View only
        if (props.rule) {
          //Prevent updating state when component is about to unmount
          if (!isCleaningUpRef.current) {
            stableSetCurrentlySelectedRule(dispatch, props.rule);
            stableSetCurrentlySelectedRuleConfig(
              dispatch,
              RULE_TYPES_CONFIG[props.rule.ruleType],
              navigate
            );
          }
        }
      } else {
        RedirectionUtils.redirectTo404(navigate);
      }
    }
  }, [
    currentlySelectedRuleConfig,
    currentlySelectedRuleData,
    MODE,
    stableInitiateBlankCurrentlySelectedRule,
    stableSetCurrentlySelectedRule,
    RULE_TO_EDIT_ID,
    RULE_TYPE_TO_CREATE,
    dispatch,
    navigate,
    stableSetCurrentlySelectedRuleConfig,
    props.rule,
    appMode,
    props.location,
  ]);

  //If "all rules" are not already there in state, fetch them.
  if (!fetchAllRulesComplete && isEmpty(allRules)) {
    Logger.log("Reading to storage in RuleBuilder");
    StorageService(appMode)
      .getRecords(GLOBAL_CONSTANTS.OBJECT_TYPES.RULE)
      .then((rules) => {
        //Set Flag to prevent loop
        setFetchAllRulesComplete(true);
        dispatch(actions.updateRulesAndGroups({ rules, groups: [] }));
      });
  }

  useEffect(() => {
    if (MODE === RULE_EDITOR_CONFIG.MODES.CREATE) {
      setStartWalkthrough(true);
    }
  }, [MODE]);

  useEffect(() => {
    const source = state?.source ?? null;
    const ruleType = currentlySelectedRuleConfig.TYPE;
    if (!ruleType || !source) return;
    trackRuleEditorViewed(source, ruleType);
  }, [currentlySelectedRuleConfig.TYPE, state]);

  useEffect(() => {
    if (
      MODE === RULE_EDITOR_CONFIG.MODES.EDIT &&
      isDesktopOnlyRule(currentlySelectedRuleData) &&
      appMode !== GLOBAL_CONSTANTS.APP_MODES.DESKTOP
    ) {
      if (
        currentlySelectedRuleConfig.TYPE ===
        GLOBAL_CONSTANTS.RULE_TYPES.REDIRECT
      )
        trackDesktopRuleViewedOnExtension("map_local");
    }
  }, [
    MODE,
    appMode,
    currentlySelectedRuleConfig.TYPE,
    currentlySelectedRuleData,
  ]);

  useEffect(() => {
    return () => {
      //Flag to prevent future state update when component is about to unmount
      isCleaningUpRef.current = true;
      cleanup(dispatch);
    };
  }, [dispatch]);

  useEffect(() => {
    if (hasRuleToEditIdChanged && MODE === RULE_EDITOR_CONFIG.MODES.EDIT) {
      cleanup(dispatch);
    }
  }, [MODE, dispatch, hasRuleToEditIdChanged]);

  // Clear currently-selected-rule when URL is changed.
  // This is imp since changing url from http://localhost:3000/rules/editor/edit/Redirect_s8g1y to http://localhost:3000/rules/editor/create/Redirect won't cause the parent component to re-render, so we need to handle it specifically.
  useEffect(() => {
    // https://stackoverflow.com/questions/39288915/detect-previous-path-in-react-router
    // prevPath will be sent by ProLayout navigation menu item
    if (
      props &&
      props.location &&
      props.location.pathname.includes("/rules/editor/create/") &&
      props.location.state &&
      props.location.state.prevPath &&
      props.location.state.prevPath.includes("/rules/editor/edit/")
    )
      cleanup(dispatch);
  }, [dispatch, props]);

  useEffect(() => {
    const unloadListener = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure?";
    };

    if (isCurrentlySelectedRuleHasUnsavedChanges) {
      window.addEventListener("beforeunload", unloadListener);
    } else {
      window.removeEventListener("beforeunload", unloadListener);
    }

    return () => window.removeEventListener("beforeunload", unloadListener);
  }, [isCurrentlySelectedRuleHasUnsavedChanges]);

  if (
    currentlySelectedRuleConfig === false ||
    currentlySelectedRuleConfig === undefined ||
    currentlySelectedRuleConfig.NAME === undefined ||
    currentlySelectedRuleData.name === undefined ||
    (MODE === RULE_EDITOR_CONFIG.MODES.CREATE &&
      currentlySelectedRuleData.ruleType !== RULE_TYPE_TO_CREATE)
  ) {
    return <SpinnerCard renderHeader />;
  }

  const isDocsVisible =
    showDocs && isRedirectRuleWithFeatureFlagOn && !props.isSharedListViewRule;

  return (
    <>
      <ProductWalkthrough
        tourFor={RULE_TYPE_TO_CREATE}
        startWalkthrough={startWalkthrough}
        context={currentlySelectedRuleData}
      />
      {MODE !== RULE_EDITOR_CONFIG.MODES.SHARED_LIST_RULE_VIEW ? (
        <Header
          mode={MODE}
          location={props.location}
          shareBtnClickHandler={shareRuleClickHandler}
          currentlySelectedRuleData={currentlySelectedRuleData}
          currentlySelectedRuleConfig={currentlySelectedRuleConfig}
        />
      ) : null}

      <Row className="w-full relative">
        <Col span={isDocsVisible ? 17 : 24}>
          <Body
            mode={MODE}
            showDocs={isDocsVisible}
            currentlySelectedRuleConfig={currentlySelectedRuleConfig}
          />
        </Col>

        {!props.isSharedListViewRule && isRedirectRuleWithFeatureFlagOn ? (
          <>
            {!showDocs ? (
              <Button
                className="rule-editor-help-btn"
                onClick={() => {
                  setShowDocs(true);
                  trackDocsSidebarViewed(currentlySelectedRuleData.ruleType);
                }}
              >
                Help
                <span>
                  <DownArrow />
                </span>
              </Button>
            ) : (
              <Col span={7}>
                <Help
                  setShowDocs={setShowDocs}
                  ruleType={currentlySelectedRuleData.ruleType}
                />
              </Col>
            )}
          </>
        ) : null}
      </Row>

      {/* Modals */}
      {isChangeRuleGroupModalActive ? (
        <ChangeRuleGroupModal
          isOpen={isChangeRuleGroupModalActive}
          toggle={toggleChangeRuleGroupModal}
          mode="CURRENT_RULE"
        />
      ) : null}
      {isShareRulesModalActive ? (
        <CreateSharedListModal
          isOpen={isShareRulesModalActive}
          toggle={toggleShareRulesModal}
          rulesToShare={selectedRules}
        />
      ) : null}
    </>
  );
};

export default RuleBuilder;
