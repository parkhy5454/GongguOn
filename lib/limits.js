const LIMITS = {
  eventTitle: 100,
  eventDescription: 2000,
  chatMessage: 1000,
  reviewComment: 1000,
  feedbackContent: 2000,
  reportDetail: 1000,
  optionName: 50,
  addressLine: 300,
};

function tooLong(str, max) {
  return typeof str === 'string' && str.length > max;
}

module.exports = { LIMITS, tooLong };
