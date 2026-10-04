import { SplitPane } from "./SplitPane";
import { PageTitle } from "@/components/ui-kaif/PageTitle";
import { EmptyState } from "@/components/ui-kaif/EmptyState";
import { L, type Label } from "@/lib/labels";

/** Temporary placeholder; route owners replace their page with real content. */
export function ComingSoon({ title }: { title: Label }) {
  return (
    <SplitPane
      left={<PageTitle label={title} />}
      right={<EmptyState label={L.comingSoon} />}
    />
  );
}
