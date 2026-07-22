import { fireEvent, render, screen } from "@testing-library/react";

import { ObjectImage } from "@/components/objects/object-image";

describe("ObjectImage", () => {
  it("renders the fallback when src is empty", () => {
    render(<ObjectImage src="" alt="An object" />);

    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders an img element when a src is given", () => {
    render(<ObjectImage src="https://example.com/image.png" alt="An object" />);

    const img = screen.getByRole("img", { name: "An object" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/image.png");
  });

  it("falls back to the placeholder if the image fails to load", () => {
    render(<ObjectImage src="https://example.com/broken.png" alt="An object" />);

    const img = screen.getByRole("img", { name: "An object" });
    fireEvent.error(img);

    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
