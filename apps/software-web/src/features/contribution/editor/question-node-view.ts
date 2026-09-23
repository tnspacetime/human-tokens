import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import { getInterviewQuestionAttributes } from "./schema";

export function createLockedQuestionNodeView(
	initialNode: ProseMirrorNode,
): NodeView {
	let node = initialNode;
	const dom = document.createElement("h1");
	dom.contentEditable = "false";

	function render() {
		const { id } = getInterviewQuestionAttributes(node);
		dom.dataset.interviewQuestion = id;
	}

	render();

	return {
		dom,
		contentDOM: dom,
		update(nextNode) {
			if (nextNode.type !== node.type) {
				return false;
			}

			node = nextNode;
			render();
			return true;
		},
		ignoreMutation: () => true,
	};
}
