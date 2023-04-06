import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { inject } from 'lib/Injector';
import { elementTypeType } from 'types/elementTypeType';
import { DropTarget } from 'react-dnd';

import AddNewButton from 'components/ElementEditor/AddNewButton';

// eslint-disable-next-line react/prefer-stateless-function
class Toolbar extends PureComponent {
  render() {
    const { elementTypes, areaId, connectDropTarget } = this.props;
    // todo reconnect dnd
    //return connectDropTarget(
    return (
      <div className="element-editor__toolbar">
        <AddNewButton
          elementTypes={elementTypes}
          areaId={areaId}
        />
      </div>
    );
  }
}

Toolbar.defaultProps = {};
Toolbar.propTypes = {
  elementTypes: PropTypes.arrayOf(elementTypeType).isRequired,
  areaId: PropTypes.number.isRequired,
  // AddNewButtonComponent: PropTypes.elementType.isRequired,
  // todo reconnect dnd
  // connectDropTarget: PropTypes.func.isRequired,
  onDragOver: PropTypes.func, // eslint-disable-line react/no-unused-prop-types
  onDragDrop: PropTypes.func, // eslint-disable-line react/no-unused-prop-types
};

const toolbarTarget = {
  hover(props) {
    const { onDragOver } = props;
    if (onDragOver) {
      onDragOver();
    }
  }
};

// export default DropTarget('element', toolbarTarget, connect => ({
//   connectDropTarget: connect.dropTarget(),
// }))(inject(
//   ['ElementAddNewButton'],
//   (AddNewButtonComponent) => ({
//     AddNewButtonComponent,
//   }),
//   () => 'ElementEditor.ElementToolbar'
// )(Toolbar));

export default Toolbar;
