function formatDate(timestamp){
  const currentDate = new Date(timestamp);
  return currentDate.toISOString();
}

module.exports = {formatDate}