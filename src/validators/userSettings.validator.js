import Joi from 'joi';

export const validateUserSettings = (data) => {
  const schema = Joi.object({
    decimalFormat: Joi.string()
      .valid('FULL AMOUNT', 'TWO DECIMAL', 'NO DECIMAL')
      .required(),
    
    companyAccount: Joi.string()
      .required()
      .min(1)
      .max(100),
    
    entryOrder: Joi.string()
      .valid('FIRST AMOUNT', 'FIRST REMARKS')
      .required(),
    
    ntPosition: Joi.string()
      .valid('TOP', 'BOTTOM')
      .required(),
    
    agentReport: Joi.string()
      .valid('ONE', 'TWO', 'THREE')
      .required(),
    
    color: Joi.string()
      .valid('Blue', 'Green', 'Red', 'Purple')
      .default('Blue'),
    
    isLocked: Joi.boolean()
      .default(false)
  });

  return schema.validate(data);
};
