function isBuildingAllowedForStudent(studentGender, buildingType) {
  if (!buildingType) return true;
  if (studentGender === 'Male') return ['Male', 'Unisex'].includes(buildingType);
  if (studentGender === 'Female') return ['Female', 'Unisex'].includes(buildingType);
  return buildingType === 'Unisex';
}

function isFeeApproved(student) {
  return student?.feeApprovalStatus === 'Approved';
}

module.exports = {
  isBuildingAllowedForStudent,
  isFeeApproved,
};
