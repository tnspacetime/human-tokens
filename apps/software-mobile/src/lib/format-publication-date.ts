const publicationDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
});

export function formatPublicationDate(publicationDate: string) {
  return publicationDateFormatter.format(
    new Date(`${publicationDate}T00:00:00.000Z`),
  );
}
