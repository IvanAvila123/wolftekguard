import { STATUS_LIST, STATUSES } from '@/wolftek/data';
import { Icon, iconName } from './icon';
import { Tag, type TagVariant } from './tag';

/** Sale status label, colored and iconed from the status catalog; `caret` hints that it can be changed. */
export function StatusTag({ status, caret = false }: { status: string; caret?: boolean }) {
    const [tagClass, iconClass] = STATUSES[status] ?? ['tag tag-neutral', 'ph ph-circle'];
    const variant = tagClass.replace('tag tag-', '') as TagVariant;

    return (
        <Tag variant={variant} icon={iconName(iconClass)}>
            {status}
            {caret && <Icon name="caret-down" size={11} style={{ marginLeft: -2, opacity: 0.7 }} />}
        </Tag>
    );
}

type StatusPickerProps = {
    status: string;
    onChange: (status: string) => void;
    disabled?: boolean;
};

/**
 * A StatusTag that changes the status in place: a native select (invisible, on top of the tag) opens the
 * system list, which works with keyboard, screen readers and phones. Clicks don't reach the row behind it.
 */
export function StatusPicker({ status, onChange, disabled = false }: StatusPickerProps) {
    return (
        <span
            className="wg-status-picker"
            style={{ position: 'relative', display: 'inline-flex', borderRadius: 999 }}
            onClick={(e) => e.stopPropagation()}
        >
            <StatusTag status={status} caret />
            <select
                aria-label={`Estatus: ${status}. Cambiar estatus`}
                value={status}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: disabled ? 'default' : 'pointer', font: 'inherit' }}
            >
                {STATUS_LIST.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </span>
    );
}
