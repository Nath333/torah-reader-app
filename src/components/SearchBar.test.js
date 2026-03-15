import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  test('renders search input', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
  });

  test('renders search button', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const button = screen.getByRole('button', { name: /submit search/i });
    expect(button).toBeInTheDocument();
  });

  test('calls onSearch with trimmed query on submit', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /submit search/i });

    await userEvent.type(input, '  Torah  ');
    fireEvent.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('Torah');
  });

  test('does not call onSearch with empty query', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const button = screen.getByRole('button', { name: /submit search/i });

    fireEvent.click(button);

    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  test('shows validation error for single character', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    await userEvent.type(input, 'a');

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent(/at least 2 characters/i);
  });

  test('clears input when clear button is clicked', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    await userEvent.type(input, 'test query');
    expect(input).toHaveValue('test query');

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
  });

  test('sanitizes XSS attempts', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    await userEvent.type(input, '<script>alert("xss")</script>');

    // Angle brackets should be removed
    expect(input.value).not.toContain('<');
    expect(input.value).not.toContain('>');
  });

  test('enforces max length', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    // Type a very long string
    const longString = 'a'.repeat(250);
    await userEvent.type(input, longString);

    // Should be truncated to max length (200)
    expect(input.value.length).toBeLessThanOrEqual(200);
  });

  test('disables input when loading', () => {
    render(<SearchBar onSearch={mockOnSearch} loading={true} />);
    const input = screen.getByRole('searchbox');
    expect(input).toBeDisabled();
  });

  test('shows loading state in button', () => {
    render(<SearchBar onSearch={mockOnSearch} loading={true} />);
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    expect(input).toHaveAttribute('aria-label');
    expect(input).toHaveAttribute('autocomplete', 'off');
  });
});
