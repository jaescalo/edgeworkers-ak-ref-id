/*
(c) Copyright 2020 Akamai Technologies, Inc. Licensed under Apache 2 license.
Version: 1.1
Purpose:  Modify an HTML streamed response by replacing a text string across the entire response. The replacement string is stored in NetStorage.
*/

import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import { TextEncoderStream, TextDecoderStream } from 'text-encode-transform';
import { FindAndReplaceStream } from 'find-replace-stream.js';
import { logger } from 'log';

const htmlEndPoint = '/failaction/maintenance.html';

// Instantiate with JSON.parse is much faster than literal object
const jsonRefIdData = JSON.parse('{\
                      "0":"ERR_NONE",\
                      "6":"ERR_CONNECT_FAIL",\
                      "18":"ERR_ACCESS_DENIED",\
                      "21":"ERR_EDGEWORKER",\
                      "52":"ERR_INVALID_CLIENT_CERT",\
                      "97":"ERR_CONNECT_TIMEOUT"\
                      }');
let errorKey = "";

export async function responseProvider (request) {
  
  let akamaiRefId = request.getVariable('PMUSER_GRN');
  logger.log("PMUSER_GRN = %s", akamaiRefId);

  let akamaiOriginalRefId = request.getVariable('PMUSER_ORIGINAL_GRN');
  logger.log("PMUSER_ORIGINAL_GRN = %s", akamaiOriginalRefId);

  let akamaiReferenceError = request.getVariable('PMUSER_REFERENCE_ERROR');
  logger.log("PMUSER_REFERENCE_ERROR = %s", akamaiReferenceError);

  let akamaiRefErrorHead = akamaiReferenceError.split(/\./)[0];
  logger.log(akamaiRefErrorHead);

  let key = "";
  for (key in jsonRefIdData) {
    if(akamaiRefErrorHead === key) {
      logger.log(jsonRefIdData[key]);
      errorKey = jsonRefIdData[key];
      break;
    }    
  }

  // Get text to be searched for and new replacement text from Property Manager variables in the request object.
  const tosearchfor = "Debugging Information";

  // Text for the replacement
  const toreplacewith = akamaiReferenceError + " " + errorKey;

  // Set to 0 to replace all, otherwise a number larger than 0 to limit replacements
  const howManyReplacements = 1;
  
  logger.log(request.scheme);
  logger.log(request.host);
  logger.log(request.url);

  return httpRequest(htmlEndPoint).then(response => {
    return createResponse(
      response.status,
      response.headers,
      response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new FindAndReplaceStream(tosearchfor, toreplacewith, howManyReplacements)).pipeThrough(new TextEncoderStream())
    );
  });
}