const db = require('../../models');
const accountApiService = require('../../services/account-api.service');
const logger = require('../../utils/logger');

/**
 * GET /auth/lifestation-account - Return LifeStation Account API data for current user's cs_no.
 * Only returns data if user has cs_no (e.g. seniors). Uses Account API (Account Read).
 */
const getLifestationAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await db.Users.findByPk(userId, {
      attributes: ['id', 'cs_no'],
    });

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!user || !user.cs_no) {
      return res.status(200).json({
        account: null,
        message: 'No LifeStation account linked (cs_no)',
      });
    }

    const accountData = await accountApiService.getAccount(user.cs_no);

    if (!accountData) {
      return res.status(200).json({
        account: null,
        message: 'LifeStation account not found',
      });
    }

    return res.status(200).json({
      account: {
        cs_no: accountData.cs_no,
        name: accountData.name,
        addr1: accountData.addr1,
        city: accountData.city,
        state: accountData.state,
        zip: accountData.zip,
        phone1: accountData.phone1,
        status: accountData.status,
      },
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(200).json({
        account: null,
        message: 'LifeStation account not found',
      });
    }
    logger.error('Error in get-lifestation-account:', error);
    return res.status(500).json({
      error: 'Failed to fetch LifeStation account',
      message: error.message || 'Internal Server Error',
    });
  }
};

module.exports = getLifestationAccount;
