import backend from 'lib/Backend';
import { getConfig } from 'state/editor/elementConfig';

const revertToBlockVersionRequest = (HistoryViewerVersionDetailComponent) => (props) => {
  const newProps = {...props};
  if (!newProps.hasOwnProperty('actions')) {
    newProps.actions = {};
  }
  newProps.actions.revertToVersion = (id, fromVersion, fromStage, toStage) => {
    const url = `${getConfig().controllerLink.replace(/\/$/, '')}/revert`;
    return backend.post(url, {
      ID: id,
      fromVersion,
      fromStage,
      toStage
    })
  }
  return <HistoryViewerVersionDetailComponent {...newProps}/>;
};

export default revertToBlockVersionRequest;
