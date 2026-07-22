import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createObject } from "@/lib/api";
import NewObjectPage from "@/app/new/page";

jest.mock("@/lib/api");
const mockedCreateObject = createObject as jest.MockedFunction<typeof createObject>;

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeImageFile(name = "photo.png") {
  return new File(["fake image content"], name, { type: "image/png" });
}

describe("NewObjectPage", () => {
  const mockCreateObjectUrl = jest.fn(() => "blob:mock-object-url");
  const mockRevokeObjectUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = mockCreateObjectUrl;
    global.URL.revokeObjectURL = mockRevokeObjectUrl;
  });

  it("keeps the Create button disabled until title, description, and an image are all provided", async () => {
    render(<NewObjectPage />);

    const submitButton = screen.getByRole("button", { name: /create object/i });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Vintage Camera" },
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "An old camera." },
    });
    expect(submitButton).toBeDisabled();

    const fileInput = document.getElementById("image") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeImageFile()] } });

    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("submits the trimmed title/description and the selected file, then navigates to the list on success", async () => {
    mockedCreateObject.mockResolvedValueOnce({
      _id: "1",
      title: "Vintage Camera",
      description: "An old camera.",
      imageUrl: "/uploads/photo.png",
      createdAt: new Date().toISOString(),
    });

    render(<NewObjectPage />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "  Vintage Camera  " },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "  An old camera.  " },
    });

    const file = makeImageFile();
    const fileInput = document.getElementById("image") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = await screen.findByRole("button", { name: /create object/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockedCreateObject).toHaveBeenCalledTimes(1));
    expect(mockedCreateObject).toHaveBeenCalledWith({
      title: "Vintage Camera",
      description: "An old camera.",
      file,
    });

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });

  it("shows an error and does not navigate when the request fails", async () => {
    mockedCreateObject.mockRejectedValueOnce(new Error("Upload failed"));

    render(<NewObjectPage />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Vintage Camera" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "An old camera." },
    });
    const fileInput = document.getElementById("image") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeImageFile()] } });

    const submitButton = await screen.findByRole("button", { name: /create object/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows an image preview thumbnail after a file is selected", async () => {
    render(<NewObjectPage />);

    const fileInput = document.getElementById("image") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeImageFile()] } });

    const preview = await screen.findByAltText("photo.png");
    expect(preview.tagName).toBe("IMG");
    expect(preview).toHaveAttribute("src", "blob:mock-object-url");
    expect(mockCreateObjectUrl).toHaveBeenCalledTimes(1);
  });

  it("shows a readable, capitalized error message when the API rejects with a class-validator style array message", async () => {
    // This mirrors what throwIfNotOk produces for a class-validator response
    // like { message: ["description must be longer than or equal to 10 characters"] }.
    mockedCreateObject.mockRejectedValueOnce(
      new Error("Description must be longer than or equal to 10 characters")
    );

    render(<NewObjectPage />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Vintage Camera" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "short" },
    });
    const fileInput = document.getElementById("image") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeImageFile()] } });

    const submitButton = await screen.findByRole("button", { name: /create object/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    const alert = await screen.findByText(
      "Description must be longer than or equal to 10 characters"
    );
    expect(alert).toHaveClass("border-destructive/30", "bg-destructive/10");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
