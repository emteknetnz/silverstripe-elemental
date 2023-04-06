/* global window */
import React, { useContext } from 'react';
import { compose } from 'redux';
import AbstractAction from 'components/ElementActions/AbstractAction';
import publishBlockMutation from 'state/editor/publishBlockMutation';
import i18n from 'i18n';
import backend from 'lib/Backend';
import { connect } from 'react-redux';
import { loadElementSchemaValue } from 'state/editor/loadElementSchemaValue';
import { loadElementFormStateName } from 'state/editor/loadElementFormStateName';
import { initialize } from 'redux-form';
// import { ElementEditorContext } from 'contexts/ElementEditorContext.js';
import {
  ElementEditorContext,
  apiPut,
  ACTION_TYPE_INCREMENT_AGE,
  ACTION_TYPE_CHANGED_NAME,
} from 'components/ElementEditor/ElementEditor';

/**
 * Show a toast message reporting whether publication of Element was successful
 *
 * @param {string} type E.g. "Content" - human friendly element type (not PHP FQCN)
 * @param {string} title Title of the element, or a false value if unset (e.g. undefined)
 * @param {boolean} success Show a success message (true), or an error message (false)
 */
const reportPublicationStatus = (type, title, success) => {
  const noTitle = i18n.inject(
    i18n._t('ElementHeader.NOTITLE', 'Untitled {type} block'),
    { type }
  );
  const successMessage = i18n.inject(
    i18n._t('ElementPublishAction.SUCCESS_NOTIFICATION', 'Published \'{title}\' successfully'),
    { title: title || noTitle }
  );
  const errorMessage = i18n.inject(
    i18n._t('ElementPublishAction.ERROR_NOTIFICATION', 'Error publishing \'{title}\''),
    { title: title || noTitle }
  );
  window.jQuery.noticeAdd({
    text: success ? successMessage : errorMessage,
    stay: false,
    type: success ? 'success' : 'error',
  });
};

/**
 * Post updated Element data to save it
 *
 * @param {number} id Element ID
 * @param {object} formData Information to be saved
 * @param {string} securityId Security ID for form submission
 */
const performSaveForElementWithFormData = (id, formData, securityId) => {
  const saveEndpoint = backend.createEndpointFetcher({
    url: loadElementSchemaValue('saveUrl', id),
    method: loadElementSchemaValue('saveMethod'),
    payloadFormat: loadElementSchemaValue('payloadFormat'),
    defaultData: {
      SecurityID: securityId
    },
  });

  // Perform save & get new version number to publish
  return saveEndpoint(formData)
    // .then(() => window.ss.apolloClient.queryManager.reFetchObservableQueries())
    .then((input) => {
      const preview = window.jQuery('.cms-preview');
      preview.entwine('ss.preview')._loadUrl(preview.find('iframe').attr('src'));
      return input;
    })
    .then((newPageData) => {
      const newElementData = newPageData[0] && newPageData[0]
        .data
        .readOneElementalArea
        .elements
        .find((elementData) => elementData.id === id);
      return newElementData && newElementData.version;
    });
};

/**
 * Adds the elemental menu action to publish a draft/modified block
 */
const PublishAction = (MenuComponent) => (props) => {

  const {
    contextState: elementEditorContextState,
    setContextState: setElementEditorContextState,
    reloadDataFromServer: elementEditorReloadDataFromServer,
    dispatch: elementEditorDispatch
  } = useContext(ElementEditorContext);

  // console.log(['PublishAction team elementEditorContextState is', elementEditorContextState]);

  if (props.type.broken) {
    // Don't allow this action for a broken element.
    return (
      <MenuComponent {...props} />
    );
  }

  const { element, formDirty } = props;

  const handleClick = (event) => {
    event.stopPropagation();

    const {
      element: {
        id,
        title,
      },
      type,
      securityId,
      formData,
      actions: { handlePublishBlock },
      reinitialiseForm,
    } = props;

    let actionFlow = new Promise((resolve) => resolve());

    // Edits have been made to the form. Peform a "Save & Publish"
    if (formDirty) {
      actionFlow = performSaveForElementWithFormData(id, formData, securityId)
        .then((passthrough) => {
          reinitialiseForm(formData);
          return passthrough;
        });
    }

    // Perform publish
    const url = loadElementSchemaValue('publishUrl', id);
    apiPut(url, { SecurityID: securityId })
      .then((response) => {
        reportPublicationStatus(type.title, title, response.ok);
        // update context
        console.log('Setting keyB from PublishAction')
        setElementEditorContextState({ ...elementEditorContextState, keyB: 789 });
        elementEditorDispatch({ type: ACTION_TYPE_INCREMENT_AGE });
        elementEditorDispatch({ type: ACTION_TYPE_CHANGED_NAME, nextName: 'bob' });
      });

    // TODO: need to update published status icon on element - need to update redux store
    // maybe just best to switch to context right now
  };

  const disabled = props.element.canPublish !== undefined && !props.element.canPublish;
  const label = i18n._t('ElementArchiveAction.PUBLISH', 'Publish');
  const title = disabled
    ? i18n._t('ElementArchiveAction.PUBLISH_PERMISSION_DENY', 'Publish, insufficient permissions')
    : label;
  const newProps = {
    label,
    title,
    disabled,
    className: 'element-editor__actions-publish',
    onClick: handleClick,
    toggle: props.toggle,
  };

  return (
    <MenuComponent {...props}>
      {props.children}
      {(formDirty || !element.isLiveVersion) && <AbstractAction {...newProps} />}
    </MenuComponent>
  );
};

function mapStateToProps(state, ownProps) {
  const formName = loadElementFormStateName(ownProps.element.id);

  let formData = null;

  if (state.form.formState.element && state.form.formState.element[formName]) {
    formData = state.form.formState.element[formName].values;
  }

  return {
    formData,
    securityId: state.config.SecurityID,
    formDirty: state.unsavedForms.find((unsaved) => unsaved.name === `element.${formName}`),
  };
}

function mapDispatchToProps(dispatch, ownProps) {
  const formName = loadElementFormStateName(ownProps.element.id);

  return {
    reinitialiseForm(savedData) {
      dispatch(initialize(`element.${formName}`, savedData));
    }
  };
}

export { PublishAction as Component };

// export default compose(
//   publishBlockMutation,
//   connect(mapStateToProps, mapDispatchToProps),
//   PublishAction
// );

export default PublishAction;
