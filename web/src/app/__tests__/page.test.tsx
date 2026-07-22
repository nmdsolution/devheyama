import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ApiObject } from "@/lib/api";
import { fetchObjects } from "@/lib/api";
import { useObjectsSocket } from "@/lib/use-objects-socket";
import ObjectsListPage from "@/app/page";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  fetchObjects: jest.fn(),
}));
jest.mock("@/lib/use-objects-socket");

const mockedFetchObjects = fetchObjects as jest.MockedFunction<typeof fetchObjects>;
const mockedUseObjectsSocket = useObjectsSocket as jest.MockedFunction<
  typeof useObjectsSocket
>;

const initialObjects: ApiObject[] = [
  {
    _id: "1",
    title: "Vintage Camera",
    description: "An old camera.",
    imageUrl: "/uploads/camera.png",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "2",
    title: "Typewriter",
    description: "Clackity clack.",
    imageUrl: "/uploads/typewriter.png",
    createdAt: new Date().toISOString(),
  },
];

const secondPageObjects: ApiObject[] = [
  {
    _id: "3",
    title: "Pocket Watch",
    description: "Ticks on time.",
    imageUrl: "/uploads/watch.png",
    createdAt: new Date().toISOString(),
  },
];

describe("ObjectsListPage", () => {
  let capturedOnCreated: ((object: ApiObject) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnCreated = undefined;
    mockedUseObjectsSocket.mockImplementation(({ onCreated }) => {
      capturedOnCreated = onCreated;
      return true;
    });
  });

  it("renders the objects returned by fetchObjects", async () => {
    mockedFetchObjects.mockResolvedValueOnce({
      items: initialObjects,
      total: initialObjects.length,
      page: 1,
      limit: 12,
      hasMore: false,
    });

    render(<ObjectsListPage />);

    expect(await screen.findByText("Vintage Camera")).toBeInTheDocument();
    expect(screen.getByText("Typewriter")).toBeInTheDocument();
    expect(mockedFetchObjects).toHaveBeenCalledTimes(1);
    expect(mockedFetchObjects).toHaveBeenCalledWith({ page: 1 });
  });

  it("adds a new object pushed over the object:created socket event without refetching", async () => {
    mockedFetchObjects.mockResolvedValueOnce({
      items: initialObjects,
      total: initialObjects.length,
      page: 1,
      limit: 12,
      hasMore: false,
    });

    render(<ObjectsListPage />);

    await screen.findByText("Vintage Camera");
    expect(mockedFetchObjects).toHaveBeenCalledTimes(1);

    const createdObject: ApiObject = {
      _id: "3",
      title: "Rotary Phone",
      description: "Ring ring.",
      imageUrl: "/uploads/phone.png",
      createdAt: new Date().toISOString(),
    };

    expect(capturedOnCreated).toBeDefined();
    act(() => {
      capturedOnCreated!(createdObject);
    });

    await waitFor(() =>
      expect(screen.getByText("Rotary Phone")).toBeInTheDocument()
    );

    // The realtime update should not have triggered another network fetch.
    expect(mockedFetchObjects).toHaveBeenCalledTimes(1);
  });

  it("shows the offline indicator when the socket reports disconnected", async () => {
    mockedUseObjectsSocket.mockImplementation(({ onCreated }) => {
      capturedOnCreated = onCreated;
      return false;
    });
    mockedFetchObjects.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 12,
      hasMore: false,
    });

    render(<ObjectsListPage />);

    expect(await screen.findByText("Offline")).toBeInTheDocument();
  });

  it("loads the next page and appends it below the existing items when Load more is clicked", async () => {
    mockedFetchObjects.mockResolvedValueOnce({
      items: initialObjects,
      total: initialObjects.length + secondPageObjects.length,
      page: 1,
      limit: 2,
      hasMore: true,
    });

    render(<ObjectsListPage />);

    await screen.findByText("Vintage Camera");
    expect(screen.getByText("Typewriter")).toBeInTheDocument();

    const loadMoreButton = screen.getByRole("button", { name: "Load more" });

    mockedFetchObjects.mockResolvedValueOnce({
      items: secondPageObjects,
      total: initialObjects.length + secondPageObjects.length,
      page: 2,
      limit: 2,
      hasMore: false,
    });

    fireEvent.click(loadMoreButton);

    expect(await screen.findByText("Pocket Watch")).toBeInTheDocument();

    // Page 1's items must still be present after appending page 2.
    expect(screen.getByText("Vintage Camera")).toBeInTheDocument();
    expect(screen.getByText("Typewriter")).toBeInTheDocument();

    expect(mockedFetchObjects).toHaveBeenCalledTimes(2);
    expect(mockedFetchObjects).toHaveBeenNthCalledWith(2, { page: 2 });

    // No more pages left, so the button should disappear.
    expect(
      screen.queryByRole("button", { name: "Load more" })
    ).not.toBeInTheDocument();
  });
});
