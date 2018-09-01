import {
    duration,
    increaseTimeTo
} from './increaseTime';

import mockCrowdsale from "./mocks/MockCrowdsale";

export default function buildTimings(startTime, log) {
    let mockCrowdsaleData = mockCrowdsale();
    let periodDuration = 200;

    //  privatePlacement
    let privatePlacementTimings = []; //  [opening, stageEdges]
    for (let i = 0; i <= mockCrowdsaleData.crowdsalePrivatePlacmentDiscounts.length; i++) {
        if (i == 0) {
            privatePlacementTimings[i] = startTime;
        } else {
            privatePlacementTimings[i] = privatePlacementTimings[i - 1] + periodDuration;
        }
    }
    if (log) {
        console.log("privatePlacement: ", privatePlacementTimings, "\n");
    }

    //  preICO
    let preICOTimings = []; //  [opening, stageEdges]
    for (let i = 0; i <= mockCrowdsaleData.crowdsalePreICODiscounts.length; i++) {
        if (i == 0) {
            preICOTimings[i] = privatePlacementTimings[privatePlacementTimings.length - 1] + duration.seconds(1);
        } else {
            preICOTimings[i] = preICOTimings[i - 1] + periodDuration;
        }
    }
    if (log) {
        console.log("preICOTimings: \n", preICOTimings, "\n");
    }

    //  ICO
    let icoTimings = []; //  [opening, stageEdges]
    for (let i = 0; i <= mockCrowdsaleData.crowdsaleICODiscounts.length; i++) {
        if (i == 0) {
            icoTimings[i] = preICOTimings[preICOTimings.length - 1] + duration.seconds(1);
        } else {
            icoTimings[i] = icoTimings[i - 1] + periodDuration;
        }
    }
    if (log) {
        console.log("icoTimings: \n", icoTimings, "\n");
    }

    return [privatePlacementTimings, preICOTimings, icoTimings];
}