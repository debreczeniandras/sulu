// @flow
import React from 'react';
import type {Element} from 'react';
import type {SelectProps} from '../Select';
import Select from '../Select';

type Props = SelectProps & {
    onChange?: (value: string | number) => void,
    value: ?string | number,
};

export default class SingleSelect extends React.PureComponent<Props> {
    static defaultProps = {
        skin: 'default',
    };

    static Action = Select.Action;
    static Option = Select.Option;
    static Divider = Select.Divider;

    get displayValue(): string {
        let displayValue = '';

        React.Children.forEach(this.props.children, (child: any) => {
            if (child.type !== SingleSelect.Option) {
                return;
            }

            if (!displayValue || this.props.value == child.props.value) {
                displayValue = child.props.children;
            }
        });

        return displayValue;
    }

    isOptionSelected = (option: Element<typeof SingleSelect.Option>): boolean => {
        const {value} = this.props;

        if (value == null) {
            return false;
        }

        return option.props.value.toString() === value.toString() && !option.props.disabled;
    };

    handleSelect = (value: string | number) => {
        if (this.props.onChange) {
            this.props.onChange(value);
        }
    };

    render() {
        const {children, icon, skin} = this.props;

        return (
            <Select
                displayValue={this.displayValue}
                icon={icon}
                isOptionSelected={this.isOptionSelected}
                onSelect={this.handleSelect}
                skin={skin}
            >
                {children}
            </Select>
        );
    }
}
