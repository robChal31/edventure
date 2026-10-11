"use client";

import { useState } from "react";
import { addStudents } from "@/lms/repositories/student-repository";
import Modal from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/panels";
import PixelButton from "@/components/ui/pixel-button";

type Props = {
    open: boolean;
    onClose: () => void;
};

/** Paste a class list: one name per line, codes are generated. */
export default function BulkAddStudents({ open, onClose }: Props) {
    const [names, setNames] = useState("");
    const [className, setClassName] = useState("");

    const list = names
        .split(/\r?\n/)
        .map((name) => name.trim())
        .filter(Boolean);

    const close = () => {
        setNames("");
        setClassName("");
        onClose();
    };

    return (
        <Modal
            open={open}
            title="Add a whole class"
            onClose={close}
            footer={
                <>
                    <PixelButton tone="slate" onClick={close}>
                        Cancel
                    </PixelButton>
                    <PixelButton
                        tone="emerald"
                        disabled={list.length === 0}
                        onClick={() => {
                            addStudents(list, className);
                            close();
                        }}
                    >
                        + Add {list.length || ""} student{list.length === 1 ? "" : "s"}
                    </PixelButton>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <Field label="Class" hint="Optional, e.g. 4A">
                    <input value={className} onChange={(e) => setClassName(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Names" hint="One student per line. A login code is created for each.">
                    <textarea
                        value={names}
                        onChange={(e) => setNames(e.target.value)}
                        rows={8}
                        placeholder={"Dewi\nEko\nFajar"}
                        className={inputClass}
                        autoFocus
                    />
                </Field>
            </div>
        </Modal>
    );
}
