import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailPage } from "@/components/detail-page";

describe("DetailPage", () => {
  it("renders related content below the main detail content", () => {
    render(
      <DetailPage
        title="Application detail"
        breadcrumbs={["Start", "Applications", "Application detail"]}
        isDirty={false}
        onBack={() => {}}
        onSave={async () => {}}
        onDismiss={() => {}}
        sidebar={<div>Sidebar metadata</div>}
        relatedContent={<div>Related runtimes section</div>}
      >
        <div>Main detail form</div>
      </DetailPage>
    );

    const mainContent = screen.getByText("Main detail form");
    const sidebar = screen.getByText("Sidebar metadata");
    const relatedContent = screen.getByText("Related runtimes section");

    expect(mainContent).toBeInTheDocument();
    expect(sidebar).toBeInTheDocument();
    expect(relatedContent).toBeInTheDocument();
    expect(mainContent.compareDocumentPosition(relatedContent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render a related content container when omitted", () => {
    render(
      <DetailPage
        title="Application detail"
        breadcrumbs={["Start", "Applications", "Application detail"]}
        isDirty={false}
        onBack={() => {}}
        onSave={async () => {}}
        onDismiss={() => {}}
      >
        <div>Main detail form</div>
      </DetailPage>
    );

    expect(screen.getByText("Main detail form")).toBeInTheDocument();
    expect(screen.queryByText("Related runtimes section")).not.toBeInTheDocument();
  });
});
