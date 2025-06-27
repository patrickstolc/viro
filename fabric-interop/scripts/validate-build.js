#!/usr/bin/env node

/**
 * Build Validation Script for ViroReact Fabric Interop
 *
 * This script validates that the fabric-interop layer is properly built
 * and all required files are present for New Architecture support.
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_FILES = [
  // JavaScript/TypeScript files
  "dist/index.js",
  "dist/index.d.ts",
  "dist/NativeViro.js",
  "dist/NativeViro.d.ts",
  "dist/ViroFabricContainer.js",
  "dist/ViroFabricContainer.d.ts",
  "dist/components/index.js",
  "dist/components/index.d.ts",
  "dist/components/ViroGlobal.js",
  "dist/components/ViroGlobal.d.ts",

  // iOS files (consolidated in main ios directory)
  "../ios/ViroReact.podspec",
  "../ios/ViroFabric/ViroFabricJSI.h",
  "../ios/ViroFabric/ViroFabricJSI.mm",
  "../ios/ViroFabric/ViroFabricContainer.h",
  "../ios/ViroFabric/ViroFabricContainer.mm",

  // Android files (relocated to viro_bridge)
  "../android/viro_bridge/build.gradle",
  "../android/viro_bridge/src/main/cpp/CMakeLists.txt",
  "../android/viro_bridge/src/main/cpp/fabric/ViroFabricContainerJSI.cpp",
  "../android/viro_bridge/src/main/java/com/viromedia/bridge/fabric/ViroFabricContainer.java",
];

// Additional Android source files to validate after relocation
const ANDROID_BRIDGE_FILES = [
  "../android/viro_bridge/src/main/java/com/viromedia/bridge/ReactViroPackage.java",
  "../android/viro_bridge/src/main/java/com/viromedia/bridge/fabric/ViroFabricContainerViewManager.java",
  "../android/viro_bridge/src/main/java/com/viromedia/bridge/fabric/ViroFabricEventDelegate.java",
  "../android/viro_bridge/src/main/java/com/viromedia/bridge/fabric/ViroFabricPackage.java",
  "../android/viro_bridge/src/main/java/com/viromedia/bridge/component/VRTComponent.java",
];

// Build artifacts to validate
const BUILD_ARTIFACTS = [
  "../android/react_viro/react_viro-release.aar",
];

const REQUIRED_EXPORTS = [
  "ViroFabricContainer",
  "ViroBox",
  "ViroScene",
  "ViroARScene",
  "ViroText",
  "ViroImage",
  "ViroAnimations",
  "ViroMaterials",
  "ViroARTrackingTargets",
];

function validateFile(filePath) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing required file: ${filePath}`);
    return false;
  }
  console.log(`✅ Found: ${filePath}`);
  return true;
}

function validateExports() {
  const indexPath = path.join(__dirname, "..", "dist", "index.js");
  if (!fs.existsSync(indexPath)) {
    console.error("❌ dist/index.js not found - build may have failed");
    return false;
  }

  try {
    const indexContent = fs.readFileSync(indexPath, "utf8");
    let allExportsFound = true;

    REQUIRED_EXPORTS.forEach((exportName) => {
      if (indexContent.includes(exportName)) {
        console.log(`✅ Export found: ${exportName}`);
      } else {
        console.error(`❌ Missing export: ${exportName}`);
        allExportsFound = false;
      }
    });

    return allExportsFound;
  } catch (error) {
    console.error(`❌ Error reading index.js: ${error.message}`);
    return false;
  }
}

function validatePackageJson() {
  const packagePath = path.join(__dirname, "..", "package.json");
  if (!fs.existsSync(packagePath)) {
    console.error("❌ package.json not found");
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    // Check required fields
    const requiredFields = ["name", "version", "main", "types"];
    let allFieldsPresent = true;

    requiredFields.forEach((field) => {
      if (packageJson[field]) {
        console.log(`✅ Package field: ${field} = ${packageJson[field]}`);
      } else {
        console.error(`❌ Missing package field: ${field}`);
        allFieldsPresent = false;
      }
    });

    // Check that main and types point to dist
    if (packageJson.main && !packageJson.main.includes("dist/")) {
      console.error(
        `❌ Package main should point to dist/ directory: ${packageJson.main}`
      );
      allFieldsPresent = false;
    }

    if (packageJson.types && !packageJson.types.includes("dist/")) {
      console.error(
        `❌ Package types should point to dist/ directory: ${packageJson.types}`
      );
      allFieldsPresent = false;
    }

    return allFieldsPresent;
  } catch (error) {
    console.error(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

function validateAndroidBridgeFiles() {
  console.log("\n🤖 Validating Android bridge source files...");
  let allValid = true;

  ANDROID_BRIDGE_FILES.forEach((file) => {
    if (!validateFile(file)) {
      allValid = false;
    }
  });

  return allValid;
}

function validateBuildArtifacts() {
  console.log("\n📦 Validating build artifacts...");
  let allValid = true;

  BUILD_ARTIFACTS.forEach((artifactPath) => {
    const fullPath = path.join(__dirname, "..", artifactPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing build artifact: ${artifactPath}`);
      allValid = false;
    } else {
      const stats = fs.statSync(fullPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ Found build artifact: ${artifactPath} (${sizeInMB} MB)`);

      // Basic size validation - AAR files should be reasonably sized
      if (stats.size < 1024) {
        console.error(
          `❌ Build artifact seems too small: ${artifactPath} (${sizeInMB} MB)`
        );
        allValid = false;
      }
    }
  });

  return allValid;
}

function validateAndroidSourceStructure() {
  console.log("\n🏗️ Validating Android source structure...");

  const viroSourcePath = path.join(
    __dirname,
    "..",
    "..",
    "android",
    "viro_bridge",
    "src",
    "main",
    "java",
    "com",
    "viromedia",
    "bridge"
  );

  if (!fs.existsSync(viroSourcePath)) {
    console.error("❌ Android viro_bridge source directory not found");
    return false;
  }

  // Check for key package directories
  const requiredPackages = ["component", "fabric", "module", "utility"];
  let allPackagesFound = true;

  requiredPackages.forEach((packageName) => {
    const packagePath = path.join(viroSourcePath, packageName);
    if (fs.existsSync(packagePath)) {
      console.log(`✅ Found package: com.viromedia.bridge.${packageName}`);
    } else {
      console.error(`❌ Missing package: com.viromedia.bridge.${packageName}`);
      allPackagesFound = false;
    }
  });

  return allPackagesFound;
}

function validateIOSSourceStructure() {
  console.log("\n🍎 Validating iOS source structure...");

  const iosSourcePath = path.join(__dirname, "..", "..", "ios", "ViroFabric");

  if (!fs.existsSync(iosSourcePath)) {
    console.error("❌ iOS ViroFabric source directory not found");
    return false;
  }

  // Check for key iOS Fabric files
  const requiredIOSFiles = [
    "ViroFabricContainer.h",
    "ViroFabricContainer.mm",
    "ViroFabricJSI.h",
    "ViroFabricJSI.mm",
    "ViroFabricManager.h",
    "ViroFabricManager.mm",
    "ViroFabricEvents.h",
    "ViroFabricEvents.m",
  ];

  let allFilesFound = true;

  requiredIOSFiles.forEach((fileName) => {
    const filePath = path.join(iosSourcePath, fileName);
    if (fs.existsSync(filePath)) {
      console.log(`✅ Found iOS file: ${fileName}`);
    } else {
      console.error(`❌ Missing iOS file: ${fileName}`);
      allFilesFound = false;
    }
  });

  // Check unified podspec
  const podspecPath = path.join(
    __dirname,
    "..",
    "..",
    "ios",
    "ViroReact.podspec"
  );
  if (fs.existsSync(podspecPath)) {
    console.log("✅ Found unified ViroReact.podspec");
  } else {
    console.error("❌ Missing unified ViroReact.podspec");
    allFilesFound = false;
  }

  return allFilesFound;
}

function validateNewArchitectureRequirement() {
  console.log("\n🔍 Validating New Architecture enforcement...");

  // Check dynamic-index.ts in parent directory
  const dynamicIndexPath = path.join(__dirname, "..", "..", "dynamic-index.ts");
  if (fs.existsSync(dynamicIndexPath)) {
    const content = fs.readFileSync(dynamicIndexPath, "utf8");
    if (
      content.includes("validateNewArchitecture") &&
      content.includes("fabric-interop")
    ) {
      console.log("✅ New Architecture validation found in dynamic-index.ts");
    } else {
      console.error(
        "❌ New Architecture validation missing in dynamic-index.ts"
      );
      return false;
    }
  }

  // Check main package.json points to fabric-interop
  const mainPackagePath = path.join(__dirname, "..", "..", "package.json");
  if (fs.existsSync(mainPackagePath)) {
    const content = fs.readFileSync(mainPackagePath, "utf8");
    const packageJson = JSON.parse(content);
    if (packageJson.main && packageJson.main.includes("fabric-interop")) {
      console.log("✅ Main package points to fabric-interop");
    } else {
      console.error("❌ Main package does not point to fabric-interop");
      return false;
    }
  }

  return true;
}

function main() {
  console.log("🚀 ViroReact Fabric Interop Build Validation\n");

  let allValid = true;

  // Validate package.json
  console.log("📦 Validating package.json...");
  if (!validatePackageJson()) {
    allValid = false;
  }

  // Validate required files
  console.log("\n📁 Validating required files...");
  REQUIRED_FILES.forEach((file) => {
    if (!validateFile(file)) {
      allValid = false;
    }
  });

  // Validate Android bridge source files (relocated)
  if (!validateAndroidBridgeFiles()) {
    allValid = false;
  }

  // Validate Android source structure
  if (!validateAndroidSourceStructure()) {
    allValid = false;
  }

  // Validate iOS source structure
  if (!validateIOSSourceStructure()) {
    allValid = false;
  }

  // Validate build artifacts
  if (!validateBuildArtifacts()) {
    allValid = false;
  }

  // Validate exports
  console.log("\n📤 Validating exports...");
  if (!validateExports()) {
    allValid = false;
  }

  // Validate New Architecture requirement
  if (!validateNewArchitectureRequirement()) {
    allValid = false;
  }

  // Final result
  console.log("\n" + "=".repeat(50));
  if (allValid) {
    console.log("🎉 BUILD VALIDATION PASSED!");
    console.log("✅ ViroReact Fabric Interop is ready for New Architecture");
    console.log("✅ Android source consolidation validated successfully");
    console.log("✅ iOS source consolidation validated successfully");
    process.exit(0);
  } else {
    console.log("❌ BUILD VALIDATION FAILED!");
    console.log("🔧 Please fix the issues above and rebuild");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateFile,
  validateExports,
  validatePackageJson,
  validateAndroidBridgeFiles,
  validateBuildArtifacts,
  validateAndroidSourceStructure,
  validateIOSSourceStructure,
};
