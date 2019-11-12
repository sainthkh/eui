import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import hljs from 'highlight.js';

import { EuiCopy } from '../copy';

import { EuiButtonIcon } from '../button';

import { EuiOverlayMask } from '../overlay_mask';

import { EuiFocusTrap } from '../focus_trap';

import { keyCodes } from '../../services';
import { EuiI18n } from '../i18n';

const fontSizeToClassNameMap = {
  s: 'euiCodeBlock--fontSmall',
  m: 'euiCodeBlock--fontMedium',
  l: 'euiCodeBlock--fontLarge',
};

export const FONT_SIZES = Object.keys(fontSizeToClassNameMap);

const paddingSizeToClassNameMap = {
  none: '',
  s: 'euiCodeBlock--paddingSmall',
  m: 'euiCodeBlock--paddingMedium',
  l: 'euiCodeBlock--paddingLarge',
};

export const PADDING_SIZES = Object.keys(paddingSizeToClassNameMap);

/**
 * This is the base component extended by EuiCode and EuiCodeBlock. These components
 * share the same propTypes definition with EuiCodeBlockImpl.
 */
export class EuiCodeBlockImpl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isFullScreen: false,
    };
  }

  highlight = () => {
    if (this.props.language) {
      hljs.highlightBlock(this.code);

      if (this.codeFullScreen) {
        hljs.highlightBlock(this.codeFullScreen);
      }
    }
  };

  onKeyDown = event => {
    if (event.keyCode === keyCodes.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      this.closeFullScreen();
    }
  };

  toggleFullScreen = () => {
    this.setState(prevState => ({
      isFullScreen: !prevState.isFullScreen,
    }));
  };

  closeFullScreen = () => {
    this.setState({
      isFullScreen: false,
    });
  };

  componentDidMount() {
    this.highlight();
  }

  componentDidUpdate() {
    this.highlight();
  }

  render() {
    const {
      inline,
      children,
      className,
      fontSize,
      language,
      overflowHeight,
      paddingSize,
      transparentBackground,
      isCopyable,
      ...otherProps
    } = this.props;

    // To maintain backwards compatibility with incorrect datatypes being passed, this
    // logic is a bit expanded to support arrays of non-strings. In those cases two bugs are present:
    // * "copy" button does not have access to the correct string values to put on the clipboard
    // * dynamically changing the content fails to update the DOM
    //
    // When this is converted to typescript and children that do not meet `string | string[]`
    // invalid uses will fail at compile time and this can be removed for the much simpler
    // const childrenAsString = typeof children === 'string' ? children : children.join('');
    let childrenAsString = children;
    if (Array.isArray(children)) {
      const isArrayOfStrings =
        children.filter(item => typeof item !== 'string').length === 0;
      if (isArrayOfStrings === true) {
        childrenAsString = children.join('');
      }
    }

    const classes = classNames(
      'euiCodeBlock',
      fontSizeToClassNameMap[fontSize],
      paddingSizeToClassNameMap[paddingSize],
      {
        'euiCodeBlock--transparentBackground': transparentBackground,
        'euiCodeBlock--inline': inline,
        'euiCodeBlock--hasControls': isCopyable || overflowHeight,
      },
      className
    );

    const codeClasses = classNames('euiCodeBlock__code', language);

    const optionalStyles = {};

    if (overflowHeight) {
      optionalStyles.maxHeight = overflowHeight;
    }

    const codeSnippet = (
      <code
        ref={ref => {
          this.code = ref;
        }}
        className={codeClasses}
        {...otherProps}>
        {childrenAsString}
      </code>
    );

    const wrapperProps = {
      className: classes,
      style: optionalStyles,
    };

    if (inline) {
      return <span {...wrapperProps}>{codeSnippet}</span>;
    }

    let copyButton;

    if (isCopyable) {
      copyButton = (
        <div className="euiCodeBlock__copyButton">
          <EuiI18n token="euiCodeBlock.copyButton" default="Copy">
            {copyButton => (
              <EuiCopy textToCopy={childrenAsString}>
                {copy => (
                  <EuiButtonIcon
                    size="s"
                    onClick={copy}
                    iconType="copy"
                    color="text"
                    aria-label={copyButton}
                  />
                )}
              </EuiCopy>
            )}
          </EuiI18n>
        </div>
      );
    }

    let fullScreenButton;

    if (!inline && overflowHeight) {
      fullScreenButton = (
        <EuiI18n
          tokens={[
            'euiCodeBlock.fullscreenCollapse',
            'euiCodeBlock.fullscreenExpand',
          ]}
          defaults={['Collapse', 'Expand']}>
          {([fullscreenCollapse, fullscreenExpand]) => (
            <EuiButtonIcon
              className="euiCodeBlock__fullScreenButton"
              size="s"
              onClick={this.toggleFullScreen}
              iconType={this.state.isFullScreen ? 'cross' : 'fullScreen'}
              color="text"
              aria-label={
                this.state.isFullScreen ? fullscreenCollapse : fullscreenExpand
              }
            />
          )}
        </EuiI18n>
      );
    }

    let codeBlockControls;

    if (copyButton || fullScreenButton) {
      codeBlockControls = (
        <div className="euiCodeBlock__controls">
          {fullScreenButton}
          {copyButton}
        </div>
      );
    }

    let fullScreenDisplay;

    if (this.state.isFullScreen) {
      {
        /*
        Force fullscreen to use large font and padding.
      */
      }
      const fullScreenClasses = classNames(
        'euiCodeBlock',
        fontSizeToClassNameMap[fontSize],
        'euiCodeBlock-paddingLarge',
        'euiCodeBlock-isFullScreen',
        className
      );

      fullScreenDisplay = (
        <EuiOverlayMask>
          <EuiFocusTrap clickOutsideDisables={true}>
            <div className={fullScreenClasses}>
              <pre className="euiCodeBlock__pre">
                <code
                  ref={ref => {
                    this.codeFullScreen = ref;
                  }}
                  className={codeClasses}
                  tabIndex={0}
                  onKeyDown={this.onKeyDown}>
                  {childrenAsString}
                </code>
              </pre>

              {codeBlockControls}
            </div>
          </EuiFocusTrap>
        </EuiOverlayMask>
      );
    }

    return (
      <div {...wrapperProps}>
        <pre style={optionalStyles} className="euiCodeBlock__pre">
          {codeSnippet}
        </pre>

        {/*
          If the below fullScreen code renders, it actually attaches to the body because of
          EuiOverlayMask's React portal usage.
        */}
        {codeBlockControls}
        {fullScreenDisplay}
      </div>
    );
  }
}

EuiCodeBlockImpl.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  className: PropTypes.string,
  paddingSize: PropTypes.oneOf(PADDING_SIZES),

  /**
   * Sets the syntax highlighting for a specific language
   */
  language: PropTypes.string,
  overflowHeight: PropTypes.number,
  fontSize: PropTypes.oneOf(FONT_SIZES),
  transparentBackground: PropTypes.bool,

  /**
   * Displays the passed code in an inline format. Also removes any margins set.
   */
  inline: PropTypes.bool,

  /**
   * Displays an icon button to copy the code snippet to the clipboard.
   */
  isCopyable: PropTypes.bool,
};

EuiCodeBlockImpl.defaultProps = {
  transparentBackground: false,
  paddingSize: 'l',
  fontSize: 's',
  isCopyable: false,
};
