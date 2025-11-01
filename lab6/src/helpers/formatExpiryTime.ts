export function formatExpiryTime(expiresAt: number): string {
  const now = Date.now();
  const timeLeft = expiresAt - now;

  if (timeLeft <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}
