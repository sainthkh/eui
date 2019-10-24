import React, { Component, FocusEvent, ReactNode, ReactElement } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel } from '../context_menu';
import { EuiPopover } from '../popover';
import { EuiButtonIcon } from '../button';
import { EuiToolTip } from '../tool_tip';
import { EuiI18n } from '../i18n';
import {
  Action,
  CustomItemAction,
  DefaultItemAction,
  DefaultItemIconButtonAction,
} from './action_types';
import { EuiIconType } from '../icon/icon';
import { ItemId } from './table_types';

export interface CollapsedItemActionsProps<T> {
  actions: Array<Action<T>>;
  item: T;
  itemId?: ItemId<T>;
  actionEnabled: (action: Action<T>) => boolean;
  className?: string;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: () => void;
}

interface CollapsedItemActionsState {
  popoverOpen: boolean;
}

export class CollapsedItemActions<T> extends Component<
  CollapsedItemActionsProps<T>,
  State
> {
  private popoverDiv: HTMLDivElement | null = null;

  state = { popoverOpen: false };

  togglePopover = () => {
    this.setState(prevState => ({ popoverOpen: !prevState.popoverOpen }));
  };

  closePopover = () => {
    this.setState({ popoverOpen: false });
  };

  onPopoverBlur = () => {
    // you must be asking... WTF? I know... but this timeout is
    // required to make sure we process the onBlur events after the initial
    // event cycle. Reference:
    // https://medium.com/@jessebeach/dealing-with-focus-and-blur-in-a-composite-widget-in-react-90d3c3b49a9b
    window.requestAnimationFrame(() => {
      if (
        !this.popoverDiv!.contains(document.activeElement) &&
        this.props.onBlur
      ) {
        this.props.onBlur();
      }
    });
  };

  registerPopoverDiv = (popoverDiv: HTMLDivElement) => {
    if (!this.popoverDiv) {
      this.popoverDiv = popoverDiv;
      this.popoverDiv.addEventListener('focusout', this.onPopoverBlur);
    }
  };

  componentWillUnmount() {
    if (this.popoverDiv) {
      this.popoverDiv.removeEventListener('focusout', this.onPopoverBlur);
    }
  }

  onClickItem = (onClickAction: (() => void) | undefined) => {
    this.closePopover();
    if (onClickAction) {
      onClickAction();
    }
  };

  render() {
    const {
      actions,
      itemId,
      item,
      actionEnabled,
      onFocus,
      className,
    } = this.props;

    const isOpen = this.state.popoverOpen;

    let allDisabled = true;
    const controls = actions.reduce<ReactElement[]>(
      (controls, action, index) => {
        const key = `action_${itemId}_${index}`;
        const available = action.available ? action.available(item) : true;
        if (!available) {
          return controls;
        }
        const enabled = actionEnabled(action);
        allDisabled = allDisabled && !enabled;
        if ((action as CustomItemAction<T>).render) {
          const customAction = action as CustomItemAction<T>;
          const actionControl = customAction.render(item, enabled);
          const actionControlOnClick =
            // @ts-ignore
            actionControl && actionControl.props && actionControl.props.onClick;
          controls.push(
            <EuiContextMenuItem
              key={key}
              onClick={
                actionControlOnClick
                  ? actionControlOnClick.bind(null, item)
                  : () => {}
              }>
              {actionControl}
            </EuiContextMenuItem>
          );
        } else {
          const {
            onClick,
            name,
            'data-test-subj': dataTestSubj,
          } = action as DefaultItemAction<T>;
          controls.push(
            <EuiContextMenuItem
              key={key}
              disabled={!enabled}
              icon={
                (action as DefaultItemIconButtonAction<T>).icon as EuiIconType
              }
              data-test-subj={dataTestSubj}
              onClick={this.onClickItem.bind(
                null,
                onClick ? onClick.bind(null, item) : undefined
              )}>
              {name}
            </EuiContextMenuItem>
          );
        }
        return controls;
      },
      []
    );

    const popoverButton = (
      <EuiI18n token="euiCollapsedItemActions.allActions" default="All actions">
        {(allActions: string) => (
          <EuiButtonIcon
            className={className}
            aria-label={allActions}
            iconType="boxesHorizontal"
            color="text"
            isDisabled={allDisabled}
            onClick={this.togglePopover.bind(this)}
            onFocus={onFocus}
            data-test-subj="euiCollapsedItemActionsButton"
          />
        )}
      </EuiI18n>
    );

    const withTooltip = !allDisabled && (
      <EuiI18n token="euiCollapsedItemActions.allActions" default="All actions">
        {(allActions: ReactNode) => (
          <EuiToolTip content={allActions} delay="long">
            {popoverButton}
          </EuiToolTip>
        )}
      </EuiI18n>
    );

    return (
      <EuiPopover
        className={className}
        popoverRef={this.registerPopoverDiv}
        id={`${itemId}-actions`}
        isOpen={isOpen}
        button={withTooltip || popoverButton}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="leftCenter">
        <EuiContextMenuPanel items={controls} />
      </EuiPopover>
    );
  }
}
