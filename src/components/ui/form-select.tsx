"use client";

import { Children, Fragment, isValidElement, useId, useRef, type ReactNode } from "react";
import Select, { type GroupBase, type StylesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";

export type SelectChoice = { value: string; label: string; icon?: string; description?: string; isDisabled?: boolean };
type ChoiceGroup = GroupBase<SelectChoice>;
type OptionProps = { value?: string | number; children?: ReactNode; label?: string; disabled?: boolean };

function textOf(node: ReactNode): string {
    return Children.toArray(node).map((child) => isValidElement<OptionProps>(child) ? textOf(child.props.children) : String(child)).join("");
}

/** Keep authored option labels and optgroups; the actual control is React Select, never a native select. */
function readOptions(children: ReactNode): (SelectChoice | ChoiceGroup)[] {
    return Children.toArray(children).flatMap((child): (SelectChoice | ChoiceGroup)[] => {
        if (!isValidElement<OptionProps>(child)) return [];
        if (child.type === Fragment) return readOptions(child.props.children);
        if (child.type === "optgroup") return [{ label: child.props.label ?? "", options: readOptions(child.props.children) as SelectChoice[] }];
        if (child.type !== "option") return [];
        const label = textOf(child.props.children);
        return [{ value: String(child.props.value ?? label), label, isDisabled: child.props.disabled }];
    });
}

// Explicit light colours also apply inside body-portalled menus, outside the staff theme.
const styles: StylesConfig<SelectChoice, false, ChoiceGroup> = {
    control: (base, state) => ({ ...base, minHeight: 42, borderWidth: 2, borderRadius: 12,
        borderColor: state.isFocused ? "#0d9488" : "#c5d8e3", backgroundColor: state.isDisabled ? "#edf2f6" : "#fff",
        boxShadow: state.isFocused ? "0 0 0 3px #ccfbf180" : "0 2px 0 #e4edf2", cursor: "pointer",
        ":hover": { borderColor: "#5fb8aa" }, fontSize: 14, color: "#244358" }),
    valueContainer: (base) => ({ ...base, padding: "3px 10px", gap: 4 }),
    input: (base) => ({ ...base, color: "#244358", margin: 0, padding: 0 }),
    singleValue: (base) => ({ ...base, color: "#244358" }),
    placeholder: (base) => ({ ...base, color: "#607d8e" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({ ...base, color: "#438c82", padding: 8 }),
    menu: (base) => ({ ...base, background: "#fff", color: "#244358", borderRadius: 12, padding: 4,
        border: "1px solid #cfdee8", boxShadow: "0 12px 32px #24435826", overflow: "hidden" }),
    menuList: (base) => ({ ...base, maxHeight: 250, padding: 2 }),
    menuPortal: (base) => ({ ...base, zIndex: 1000 }),
    option: (base, state) => ({ ...base, borderRadius: 8, fontSize: 14, padding: "10px 12px", cursor: "pointer",
        backgroundColor: state.isSelected ? "#ccf3e8" : state.isFocused ? "#eef9f5" : "#fff",
        color: state.isDisabled ? "#8ca1ae" : state.isSelected ? "#086448" : "#244358",
        ":active": { backgroundColor: "#d8f4e9" } }),
    groupHeading: (base) => ({ ...base, color: "#57788b", fontSize: 11, marginTop: 8 }),
};

type FormSelectProps = {
    value: string | number | null | undefined;
    onValueChange: (value: string) => void;
    children?: ReactNode;
    options?: readonly SelectChoice[];
    className?: string;
    id?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    autoFocus?: boolean;
    searchable?: boolean;
    onOpenChange?: (open: boolean) => void;
    placeholder?: string;
    "aria-label"?: string;
    "aria-describedby"?: string;
};

export default function FormSelect({ value, onValueChange, children, options, className = "", id, name,
    disabled, required, autoFocus, searchable = true, onOpenChange, placeholder = "…", ...aria }: FormSelectProps) {
    const instanceId = useId();
    const menuOpen = useRef(false);
    const choices = options ? [...options] : readOptions(children);
    const flat = choices.flatMap((entry) => "options" in entry ? entry.options : [entry]);
    return <Select<SelectChoice, false, ChoiceGroup>
        instanceId={instanceId} inputId={id ?? instanceId} name={name} options={choices}
        value={flat.find((option) => option.value === String(value ?? "")) ?? null}
        onChange={(choice) => onValueChange(choice?.value ?? "")}
        className={`form-select min-w-0 ${className}`} classNamePrefix="lw-select" styles={styles}
        isDisabled={disabled} required={required} autoFocus={autoFocus} isSearchable={searchable}
        blurInputOnSelect={!searchable}
        onMenuOpen={() => { menuOpen.current = true; onOpenChange?.(true); }}
        onMenuClose={() => { menuOpen.current = false; onOpenChange?.(false); }}
        onKeyDown={(event) => { if (event.key === "Escape" && menuOpen.current) event.stopPropagation(); }}
        placeholder={placeholder} menuPlacement="auto" menuPosition="fixed" menuShouldScrollIntoView={false}
        menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
        formatOptionLabel={(choice, meta) => choice.icon || choice.description ? <span className="select-choice">
            {choice.icon && <span className={`select-choice-icon choice-${choice.value}`} aria-hidden>{choice.icon}</span>}
            <span><span className="select-choice-label">{choice.label}</span>
                {meta.context === "menu" && choice.description && <span className="select-choice-description">{choice.description}</span>}</span>
        </span> : choice.label}
        {...aria}
    />;
}

/** Searchable suggestions without losing the old datalist's free-text authoring. */
export function CreatableField({ value, onValueChange, options, placeholder, "aria-label": label }: {
    value: string; onValueChange: (value: string) => void; options: readonly string[];
    placeholder?: string; "aria-label": string;
}) {
    const id = useId();
    const menuOpen = useRef(false);
    return <CreatableSelect<SelectChoice, false, ChoiceGroup>
        instanceId={id} inputId={id} aria-label={label} className="form-select" classNamePrefix="lw-select" styles={styles}
        options={Array.from(new Set(options)).map((text) => ({ value: text, label: text }))}
        value={value ? { value, label: value } : null} inputValue={value} controlShouldRenderValue={false}
        onInputChange={(text, action) => { if (action.action === "input-change") onValueChange(text); }}
        onChange={(choice) => onValueChange(choice?.value ?? "")} onCreateOption={onValueChange}
        onMenuOpen={() => { menuOpen.current = true; }} onMenuClose={() => { menuOpen.current = false; }}
        onKeyDown={(event) => { if (event.key === "Escape" && menuOpen.current) event.stopPropagation(); }}
        formatCreateLabel={(text) => `+ ${text}`} placeholder={placeholder}
        menuPlacement="auto" menuPosition="fixed" menuShouldScrollIntoView={false}
        menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
    />;
}
