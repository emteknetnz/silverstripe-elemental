/* global window */
import React, { useState, createContext, useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { inject } from 'lib/Injector';
import { compose } from 'redux';
import { elementTypeType } from 'types/elementTypeType';
import { connect } from 'react-redux';
import { loadElementFormStateName } from 'state/editor/loadElementFormStateName';
import { DropTarget } from 'react-dnd';
import sortBlockMutation from 'state/editor/sortBlockMutation';
import ElementDragPreview from 'components/ElementEditor/ElementDragPreview';
import withDragDropContext from 'lib/withDragDropContext';
import { createSelector } from 'reselect';
import { loadElementSchemaValue } from 'state/editor/loadElementSchemaValue';

import Toolbar from 'components/ElementEditor/Toolbar';
import ElementList from 'components/ElementEditor/ElementList';


// these should live in some lib
function apiFetch(url, options) {
  console.log(['API fetching', url, options]);
  return (async () => await fetch(url, options))();
}

export function apiGet(url) {
  return apiFetch(url, { method: 'GET' });
}

export function apiPut(url, data) {
  return apiFetch(url, { method: 'PUT', body: JSON.stringify(data) });
}

export const ElementEditorContext = createContext(null);

export const ACTION_TYPE_INCREMENT_AGE = 'INCREMENT_AGE';
export const ACTION_TYPE_CHANGED_NAME = 'CHANGED_NAME';

function reducer(state, action) {
  console.log(['Reducing', action]);
  let newState;
  if (action.type === ACTION_TYPE_INCREMENT_AGE) {
    newState = {
      ...state,
      age: state.age + 1
    };
  } else if (action.type === ACTION_TYPE_CHANGED_NAME) {
    newState = {
      ...state,
      name: action.nextName,
    };
  } else {
    throw Error('Unknown action: ' + action.type);
  }
  console.log(['New state is', newState]);
  return newState;
}

/**
 * The ElementEditor is used in the CMS to manage a list or nested lists of
 * elements for a page or other DataObject.
 */
function ElementEditor({
  fieldName,
  formState,
  areaId,
  elementTypes,
  isDraggingOver,
  connectDropTarget,
  allowedElements,
}) {
  const [contextState, setContextState] = useState(null);
  const [dragTargetElementId, setDragTargetElementId] = useState(null);
  const [dragSpot, setDragSpot] = useState(null);

  const [state, dispatch] = useReducer(reducer, { age: 42 });

  function reloadDataFromServer() {
    const url = loadElementSchemaValue('areasUrl', areaId);
    apiGet(url)
      .then(async (response) => await response.json())
      .then((responseJson) => setContextState({...contextState, ...responseJson}))
  }

  /**
   * Hook for ReactDND triggered by hovering over a drag _target_.
   *
   * This tracks the current hover target and whether it's above the top half of the target
   * or the bottom half.
   */
  function handleDragOver(element = null, isOverTop = null) {
    const id = element ? element.id : false;
    setDragTargetElementId(id);
    setDragSpot(isOverTop === false ? 'bottom' : 'top');
  }

  /**
   * Hook for ReactDND triggered when a drag source is dropped onto a drag target.
   *
   * This will fire the GraphQL mutation for sorting and reset any state updates
   */
  function handleDragEnd(sourceId, afterId) {
    // const { actions: { handleSortBlock }, areaId } = this.props;
    handleSortBlock(sourceId, afterId, areaId).then(() => {
      const preview = window.jQuery('.cms-preview');
      preview.entwine('ss.preview')._loadUrl(preview.find('iframe').attr('src'));
    });
    setDragTargetElementId(null);
    setDragSpot(null);
  }

  function handleDragStart() {
    // noop - wasn't in original class component
  }

  // Map the allowed elements because we want to retain the sort order provided by that array.
  const allowedElementTypes = allowedElements.map(className =>
    elementTypes.find(type => type.class === className)
  );

  // Make initial request to API to get data for ElementalArea and populate context state
  // The emtpy array 2nd param means this will only get called on 1st render
  useEffect(() => reloadDataFromServer(), []);

  //console.log(['ElementEditor contextState is', contextState]);
  console.log(['ElementEditor formState is', formState]);

  // todo reimplment connectDropTarget
  //return connectDropTarget(
  return (
    <div className="element-editor">
      <ElementEditorContext.Provider value={{
        contextState,
        setContextState,
        reloadDataFromServer,
        dispatch
      }}>
      <Toolbar
        elementTypes={allowedElementTypes}
        areaId={areaId}
        onDragOver={handleDragOver}
      />
      <ElementList
        allowedElementTypes={allowedElementTypes}
        elementTypes={elementTypes}
        areaId={areaId}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        dragSpot={dragSpot}
        isDraggingOver={isDraggingOver}
        dragTargetElementId={dragTargetElementId}
      />
      <ElementDragPreview elementTypes={elementTypes} />
        <input
          name={fieldName}
          type="hidden"
          value={JSON.stringify(formState) || ''}
          className="no-change-track"
        />
      </ElementEditorContext.Provider>
    </div>
  );

  function OLD_render() {
    <div className="element-editor">
      <ElementEditorContext.Provider value={{
        contextState,
        setContextState,
        reloadDataFromServer,
        dispatch
      }}>
        <Toolbar
          elementTypes={allowedElementTypes}
          areaId={areaId}
          onDragOver={handleDragOver}
        />
        <ElementList
          allowedElementTypes={allowedElementTypes}
          elementTypes={elementTypes}
          areaId={areaId}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          dragSpot={dragSpot}
          isDraggingOver={isDraggingOver}
          dragTargetElementId={dragTargetElementId}
        />
        <ElementDragPreview elementTypes={elementTypes} />
        <input
          name={fieldName}
          type="hidden"
          value={JSON.stringify(formState) || ''}
          className="no-change-track"
        />
      </ElementEditorContext.Provider>
    </div>
  }
}



ElementEditor.propTypes = {
  fieldName: PropTypes.string,
  elementTypes: PropTypes.arrayOf(elementTypeType).isRequired,
  allowedElements: PropTypes.arrayOf(PropTypes.string).isRequired,
  areaId: PropTypes.number.isRequired,
  actions: PropTypes.shape({
    handleSortBlock: PropTypes.func,
  }),
};

const elementFormSelector = createSelector([
  (state) => {
    const elementFormState = state.form.formState.element;

  if (!elementFormState) {
    return {};
  }

  return elementFormState;
  }], (elementFormState) => {
    const formNamePattern = loadElementFormStateName('[0-9]+');

  return Object.keys(elementFormState)
  .filter(key => key.match(formNamePattern))
  .reduce((accumulator, key) => ({
    ...accumulator,
    [key]: elementFormState[key].values
  }), {});
});

function mapStateToProps(state) {
  // memoize form state and value changes
  const formState = elementFormSelector(state);

  return { formState };
}

export default ElementEditor;

export { ElementEditor as Component };

// export default compose(
//   withDragDropContext,
//   DropTarget('element', {}, (connector, monitor) => ({
//     connectDropTarget: connector.dropTarget(),
//     isDraggingOver: monitor.isOver(), // isDragging is not available on DropTargetMonitor
//   })),
//   connect(mapStateToProps),
//   inject(
//     ['ElementToolbar', 'ElementList'],
//     (ToolbarComponent, ListComponent) => ({
//       ToolbarComponent,
//       ListComponent,
//     }),
//     () => 'ElementEditor'
//   ),
//   sortBlockMutation
// )(ElementEditor);

