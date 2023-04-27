import { Button, Empty, Input, Select, Space, Spin } from "antd";
import React, { SyntheticEvent, useCallback, useEffect, useState } from "react";
import Split from "react-split";
import { KeyValuePair, RQAPI, RequestContentType, RequestMethod } from "../types";
import RequestTabs from "./request/RequestTabs";
import { getEmptyPair } from "./request/KeyValueForm";
import ResponseTabs from "./response/ResponseTabs";
import { CloseCircleFilled } from "@ant-design/icons";
import { getEmptyAPIEntry, makeRequest, supportsRequestBody } from "../apiUtils";
import "./apiClientView.scss";

interface Props {
  apiEntry?: RQAPI.Entry;
  notifyApiRequestFinished?: (apiEntry: RQAPI.Entry) => void;
}

const requestMethodOptions = Object.values(RequestMethod).map((method) => ({
  value: method,
  label: method,
}));

const APIClientView: React.FC<Props> = ({ apiEntry, notifyApiRequestFinished }) => {
  const [entry, setEntry] = useState<RQAPI.Entry>(getEmptyAPIEntry());
  const [isFailed, setIsFailed] = useState(false);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);

  useEffect(() => {
    if (apiEntry) {
      setEntry(apiEntry);
    }
  }, [apiEntry]);

  const setUrl = useCallback((url: string) => {
    setEntry((entry) => ({
      ...entry,
      request: {
        ...entry.request,
        url,
      },
    }));
  }, []);

  const setMethod = useCallback((method: RequestMethod) => {
    setEntry((entry) => {
      const newEntry: RQAPI.Entry = {
        ...entry,
        request: {
          ...entry.request,
          method,
        },
      };

      if (!supportsRequestBody(method)) {
        newEntry.request.body = null;
      }
      return newEntry;
    });
  }, []);

  const setQueryParams = useCallback((queryParams: KeyValuePair[]) => {
    setEntry((entry) => ({
      ...entry,
      request: {
        ...entry.request,
        queryParams,
      },
    }));
  }, []);

  const setBody = useCallback((body: string) => {
    setEntry((entry) => ({
      ...entry,
      request: {
        ...entry.request,
        body,
      },
    }));
  }, []);

  const setRequestHeaders = useCallback((headers: KeyValuePair[]) => {
    setEntry((entry) => ({
      ...entry,
      request: {
        ...entry.request,
        headers,
      },
    }));
  }, []);

  const setContentType = useCallback((contentType: RequestContentType) => {
    setEntry((entry) => {
      const newEntry: RQAPI.Entry = {
        ...entry,
        request: {
          ...entry.request,
          contentType,
        },
      };

      const CONTENT_TYPE_HEADER = "Content-Type";

      const headers = newEntry.request.headers.filter((header) => header.key !== CONTENT_TYPE_HEADER);

      let contentTypeHeader = headers.find((header) => !header.key && !header.value); // reuse empty header
      if (!contentTypeHeader) {
        contentTypeHeader = getEmptyPair();
        headers.push(contentTypeHeader);
      }

      contentTypeHeader.key = CONTENT_TYPE_HEADER;
      contentTypeHeader.value = contentType;
      newEntry.request.headers = headers;

      if (contentType === RequestContentType.JSON) {
        newEntry.request.body = "{}";
      } else if (contentType === RequestContentType.FORM) {
        newEntry.request.body = [];
      } else {
        newEntry.request.body = "";
      }

      return newEntry;
    });
  }, []);

  const addUrlSchemeIfMissing = useCallback(() => {
    if (entry.request.url && !/^https?:\/\//.test(entry.request.url)) {
      setEntry((entry) => ({
        ...entry,
        request: {
          ...entry.request,
          url: "https://" + entry.request.url,
        },
      }));
    }
  }, [entry]);

  const onSendButtonClick = useCallback(() => {
    if (!entry.request.url) {
      return;
    }

    const removeEmptyKeys = (keyValuePairs: KeyValuePair[]): KeyValuePair[] => {
      return keyValuePairs.filter((pair) => pair.key.length);
    };

    const sanitizedEntry: RQAPI.Entry = {
      ...entry,
      request: {
        ...entry.request,
        queryParams: removeEmptyKeys(entry.request.queryParams),
        headers: removeEmptyKeys(entry.request.headers),
      },
      response: null,
    };

    if (!supportsRequestBody(entry.request.method)) {
      sanitizedEntry.request.body = null;
    } else if (entry.request.contentType === RequestContentType.FORM) {
      sanitizedEntry.request.body = removeEmptyKeys(sanitizedEntry.request.body as KeyValuePair[]);
    }

    setEntry(sanitizedEntry);
    setIsFailed(false);
    setIsLoadingResponse(true);

    makeRequest(sanitizedEntry.request).then((response) => {
      const entryWithResponse = { ...sanitizedEntry, response };
      if (response) {
        setEntry(entryWithResponse);
      } else {
        setIsFailed(true);
      }
      setIsLoadingResponse(false);
      notifyApiRequestFinished?.(entryWithResponse);
    });
  }, [entry, notifyApiRequestFinished]);

  const onUrlInputEnterPressed = useCallback((evt: SyntheticEvent<HTMLInputElement>) => {
    (evt.target as HTMLInputElement).blur();
  }, []);

  return (
    <div className="api-client-view">
      <div className="api-client-header">
        <Space.Compact className="api-client-url-container">
          <Select
            className="api-request-method-selector"
            options={requestMethodOptions}
            value={entry.request.method}
            onChange={setMethod}
          />
          <Input
            className="api-request-url"
            placeholder="https://example.com"
            value={entry.request.url}
            onChange={(evt) => setUrl(evt.target.value)}
            onPressEnter={onUrlInputEnterPressed}
            onBlur={addUrlSchemeIfMissing}
          />
        </Space.Compact>
        <Button type="primary" onClick={onSendButtonClick} loading={isLoadingResponse} disabled={!entry.request.url}>
          Send
        </Button>
      </div>
      <Split
        className="api-client-body"
        direction="vertical"
        cursor="row-resize"
        sizes={[40, 60]}
        minSize={[200, 200]}
        gutterSize={6}
        gutterAlign="center"
        snapOffset={30}
      >
        <RequestTabs
          request={entry.request}
          setQueryParams={setQueryParams}
          setBody={setBody}
          setRequestHeaders={setRequestHeaders}
          setContentType={setContentType}
        />
        <div className="api-response-view">
          {entry.response ? (
            <ResponseTabs response={entry.response} />
          ) : (
            <div className="api-response-empty-placeholder">
              {isLoadingResponse ? (
                <Spin size="large" tip="Request in progress..." />
              ) : isFailed ? (
                <div className="api-response-empty-placeholder">
                  <Space>
                    <CloseCircleFilled style={{ color: "#ff4d4f" }} />
                    Failed to send the request. Please check if the URL is valid.
                  </Space>
                </div>
              ) : (
                <Empty description="No request sent." />
              )}
            </div>
          )}
        </div>
      </Split>
    </div>
  );
};

export default APIClientView;
