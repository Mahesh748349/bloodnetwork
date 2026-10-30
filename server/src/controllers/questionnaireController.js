const DonorQuestionnaire = require('../models/DonorQuestionnaire');
const DonorProfile = require('../models/DonorProfile');
const { logAction } = require('../services/auditService');

/**
 * @route   POST /api/questionnaires
 * @desc    Donor submits pre-donation health screening questionnaire
 * @access  Private (Donor)
 */
const submitQuestionnaire = async (req, res, next) => {
  try {
    const {
      bloodRequestId,
      donationEventId,
      recentIllness = {},
      recentMedications = {},
      recentTravel = {},
      weightKg,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      hemoglobinSelfReport,
      lastMealHoursAgo,
      alcoholLast24h = false,
      tattooPiercingLast6m = false,
      pregnantOrRecentBirth = false,
      consentToScreening,
    } = req.body;

    if (!consentToScreening) {
      return res.status(400).json({
        success: false,
        message: 'You must confirm and consent to the health declaration questionnaire.',
      });
    }

    // Automated clinical safety pre-screening
    const flaggedReasons = [];

    if (recentIllness.hasIllness) {
      flaggedReasons.push(`Reported recent illness: ${recentIllness.details || 'unspecified'}`);
    }
    if (tattooPiercingLast6m) {
      flaggedReasons.push('Tattoo or piercing within the last 6 months (infection risk deferral window)');
    }
    if (alcoholLast24h) {
      flaggedReasons.push('Alcohol intake within the last 24 hours');
    }
    if (pregnantOrRecentBirth) {
      flaggedReasons.push('Pregnancy or childbirth within 12 months');
    }
    if (weightKg && Number(weightKg) < 45) {
      flaggedReasons.push(`Body weight (${weightKg} kg) is below minimum safe threshold (45 kg)`);
    }
    if (hemoglobinSelfReport && Number(hemoglobinSelfReport) < 12.5) {
      flaggedReasons.push(`Self-reported hemoglobin (${hemoglobinSelfReport} g/dL) is below safe cutoff (12.5 g/dL)`);
    }

    let screeningResult = 'passed';
    if (flaggedReasons.length > 0) {
      screeningResult = 'flagged';
    }

    const questionnaire = await DonorQuestionnaire.create({
      donorId: req.user.id,
      bloodRequestId: bloodRequestId || null,
      donationEventId: donationEventId || null,
      recentIllness,
      recentMedications,
      recentTravel,
      weightKg: weightKg ? Number(weightKg) : null,
      bloodPressureSystolic: bloodPressureSystolic ? Number(bloodPressureSystolic) : null,
      bloodPressureDiastolic: bloodPressureDiastolic ? Number(bloodPressureDiastolic) : null,
      hemoglobinSelfReport: hemoglobinSelfReport ? Number(hemoglobinSelfReport) : null,
      lastMealHoursAgo: lastMealHoursAgo ? Number(lastMealHoursAgo) : null,
      alcoholLast24h: Boolean(alcoholLast24h),
      tattooPiercingLast6m: Boolean(tattooPiercingLast6m),
      pregnantOrRecentBirth: Boolean(pregnantOrRecentBirth),
      consentToScreening: true,
      screeningResult,
      flaggedReasons,
    });

    return res.status(201).json({
      success: true,
      message:
        screeningResult === 'passed'
          ? 'Health questionnaire cleared successfully. You are pre-cleared for donation!'
          : 'Health questionnaire flagged for clinical review prior to collection.',
      screeningResult,
      flaggedReasons,
      questionnaire,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/questionnaires/me
 * @desc    Get donor's own previous screening questionnaires
 * @access  Private (Donor)
 */
const getMyQuestionnaires = async (req, res, next) => {
  try {
    const records = await DonorQuestionnaire.find({ donorId: req.user.id })
      .populate('bloodRequestId', 'hospital bloodGroup urgency')
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      questionnaires: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/questionnaires/request/:requestId
 * @desc    Hospital staff retrieves submitted questionnaires for a blood request
 * @access  Private (Hospital Staff, Admin)
 */
const getQuestionnaireByRequest = async (req, res, next) => {
  try {
    const questionnaires = await DonorQuestionnaire.find({
      bloodRequestId: req.params.requestId,
    })
      .populate('donorId', 'name email phone')
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      questionnaires,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/questionnaires/:id/review
 * @desc    Medical staff reviews and approves or defers a flagged questionnaire
 * @access  Private (Hospital Staff, Admin)
 */
const reviewQuestionnaire = async (req, res, next) => {
  try {
    const { decision, notes } = req.body; // 'passed' | 'deferred'

    if (!['passed', 'deferred'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be 'passed' or 'deferred'.",
      });
    }

    const questionnaire = await DonorQuestionnaire.findById(req.params.id);
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found',
      });
    }

    questionnaire.screeningResult = decision;
    questionnaire.reviewedByStaff = req.user.id;
    questionnaire.reviewedAt = new Date();
    if (notes) {
      questionnaire.flaggedReasons.push(`Staff Review: ${notes}`);
    }
    await questionnaire.save();

    await logAction({
      actorId: req.user.id,
      action: 'REVIEW_QUESTIONNAIRE',
      recordModel: 'User',
      recordId: questionnaire.donorId,
      details: { decision, notes, questionnaireId: questionnaire._id },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Questionnaire marked as ${decision}`,
      questionnaire,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitQuestionnaire,
  getMyQuestionnaires,
  getQuestionnaireByRequest,
  reviewQuestionnaire,
};

