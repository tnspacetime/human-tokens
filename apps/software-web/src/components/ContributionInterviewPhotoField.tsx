import { useEffect, useRef, useState } from "react";
import {
	Attachment,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
	AttachmentTrigger,
} from "./ui/attachment";

const MAX_PORTRAIT_IMAGE_BYTES = 8 * 1024 * 1024;
const PORTRAIT_IMAGE_CONTENT_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
]);

type PortraitImageState = "idle" | "uploading" | "error" | "done";

function getUploadResponse(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		!("item" in value) ||
		typeof value.item !== "object" ||
		value.item === null ||
		!("url" in value.item) ||
		typeof value.item.url !== "string" ||
		!("etag" in value.item) ||
		typeof value.item.etag !== "string"
	) {
		return null;
	}

	return { url: value.item.url, etag: value.item.etag };
}

async function getUploadError(response: Response) {
	try {
		const value: unknown = await response.json();

		if (
			typeof value === "object" &&
			value !== null &&
			"error" in value &&
			typeof value.error === "object" &&
			value.error !== null &&
			"message" in value.error &&
			typeof value.error.message === "string"
		) {
			return value.error.message;
		}
	} catch {
		// Use the stable fallback below when the server response is not JSON.
	}

	return "Uploading the interview photo failed. Try again.";
}

export default function ContributionInterviewPhotoField({
	linkId,
	imageUrl,
	onImageUrlChange,
}: {
	linkId: string;
	imageUrl: string | null;
	onImageUrlChange: (imageUrl: string | null) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const localObjectUrlRef = useRef<string | null>(null);
	const [state, setState] = useState<PortraitImageState>(
		imageUrl ? "done" : "idle",
	);
	const [fileName, setFileName] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(
		() => () => {
			if (localObjectUrlRef.current) {
				URL.revokeObjectURL(localObjectUrlRef.current);
			}
		},
		[],
	);

	let description = "JPEG, PNG or WebP, up to 8 MB.";

	if (state === "uploading") {
		description = "Uploading…";
	} else if (state === "done") {
		description = "Uploaded · Click to replace";
	} else if (state === "error") {
		description =
			errorMessage ?? "Uploading the interview photo failed. Try again.";
	}

	async function uploadPortraitImage(file: File) {
		if (!PORTRAIT_IMAGE_CONTENT_TYPES.has(file.type)) {
			setState("error");
			setErrorMessage("Choose a JPEG, PNG, or WebP image.");
			return;
		}

		if (file.size === 0 || file.size > MAX_PORTRAIT_IMAGE_BYTES) {
			setState("error");
			setErrorMessage(
				file.size === 0
					? "The selected image is empty."
					: "Choose an image that is 8 MB or smaller.",
			);
			return;
		}

		if (localObjectUrlRef.current) {
			URL.revokeObjectURL(localObjectUrlRef.current);
		}

		const localObjectUrl = URL.createObjectURL(file);
		localObjectUrlRef.current = localObjectUrl;
		onImageUrlChange(localObjectUrl);
		setFileName(file.name);
		setErrorMessage(null);
		setState("uploading");

		try {
			const response = await fetch(
				`/api/v1/contribution/${encodeURIComponent(linkId)}/portrait-image`,
				{
					method: "PUT",
					headers: { "Content-Type": file.type },
					body: file,
				},
			);

			if (!response.ok) {
				setErrorMessage(await getUploadError(response));
				setState("error");
				return;
			}

			const result = getUploadResponse(await response.json());

			if (!result) {
				setErrorMessage("The upload response was invalid. Try again.");
				setState("error");
				return;
			}

			const version = result.etag.replaceAll('"', "");
			onImageUrlChange(`${result.url}?v=${encodeURIComponent(version)}`);
			setState("done");

			URL.revokeObjectURL(localObjectUrl);
			if (localObjectUrlRef.current === localObjectUrl) {
				localObjectUrlRef.current = null;
			}
		} catch {
			setErrorMessage("Uploading the interview photo failed. Try again.");
			setState("error");
		}
	}

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				className="sr-only"
				onChange={(event) => {
					const file = event.currentTarget.files?.[0];
					event.currentTarget.value = "";

					if (file) {
						void uploadPortraitImage(file);
					}
				}}
			/>
			<Attachment
				state={state}
				aria-busy={state === "uploading"}
				className="w-full max-w-100 flex-nowrap rounded-[1.4rem] border-0 bg-transparent shadow-none"
			>
				<AttachmentMedia
					variant={imageUrl ? "image" : "icon"}
					className="w-20 rounded-[1.15rem] bg-[#0071e3] group-data-[state=error]/attachment:bg-[#0071e3]"
				>
					{imageUrl ? (
						<img
							src={imageUrl}
							alt=""
							className="size-full object-cover"
							onError={() => {
								onImageUrlChange(null);
								setErrorMessage("The interview photo could not be displayed.");
								setState("error");
							}}
						/>
					) : null}
				</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>
						{fileName ?? (imageUrl ? "Interview photo" : "Add interview photo")}
					</AttachmentTitle>
					<AttachmentDescription aria-live="polite">
						{description}
					</AttachmentDescription>
				</AttachmentContent>
				<AttachmentTrigger
					aria-label={
						imageUrl ? "Replace interview photo" : "Add interview photo"
					}
					disabled={state === "uploading"}
					onClick={() => inputRef.current?.click()}
				/>
			</Attachment>
		</>
	);
}
