// @flow
import React from 'react';
import type {Node} from 'react';
import classNames from 'classnames';
import Icon from '../Icon';
import Loader from '../Loader';
import buttonStyles from './button.scss';

const LOADER_SIZE = 25;

type Props = {|
    active: boolean,
    activeClassName?: string,
    children?: Node,
    className?: string,
    disabled: boolean,
    icon?: string,
    iconClassName?: string,
    loading: boolean,
    onClick?: (value: *) => void,
    showDropdownIcon: boolean,
    size: 'small' | 'large',
    skin: 'primary' | 'secondary' | 'link' | 'icon',
    type: 'button' | 'submit' | 'reset',
    value?: *,
|};

export default class Button extends React.PureComponent<Props> {
    static defaultProps = {
        active: false,
        disabled: false,
        loading: false,
        showDropdownIcon: false,
        size: 'large',
        skin: 'secondary',
        type: 'button',
    };

    handleClick = (event: SyntheticEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const onClick = this.props.onClick;

        if (onClick) {
            onClick(this.props.value);
        }
    };

    render() {
        const {
            active,
            activeClassName,
            children,
            className,
            disabled,
            icon,
            iconClassName,
            loading,
            onClick,
            showDropdownIcon,
            skin,
            type,
        } = this.props;

        const buttonClass = classNames(
            buttonStyles.button,
            buttonStyles[skin],
            {
                [buttonStyles.loading]: loading,
                [buttonStyles.active]: active,
                [activeClassName || '']: active && activeClassName,
            },
            className
        );
        const iconClass = classNames(
            buttonStyles.buttonIcon,
            iconClassName
        );

        return (
            <button
                className={buttonClass}
                disabled={loading || disabled}
                onClick={onClick ? this.handleClick : undefined}
                type={type}
            >
                {icon &&
                    <Icon className={iconClass} name={icon} />
                }
                {children &&
                    <span className={buttonStyles.text}>{children}</span>
                }
                {showDropdownIcon &&
                    <Icon className={buttonStyles.dropdownIcon} name="su-angle-down" />
                }
                {loading &&
                    <div className={buttonStyles.loader}>
                        <Loader size={LOADER_SIZE} />
                    </div>
                }
            </button>
        );
    }
}
