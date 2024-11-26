const { withPodfile, withAppDelegate } = require('expo/config-plugins.js');

const ASATOOLS_PODFILE_LINE = `
  pod 'ASATools', '~> 1.4.0'  
  
  pre_install do |installer|
      installer.pod_targets.each do |pod|
          if pod.name == 'ASATools'
              def pod.build_type;
                  Pod::BuildType.new(:linkage => :dynamic, :packaging => :framework)
              end
          end
      end
  end
`

const ASATOOLS_APPDELEGATE_IMPORT = `\
#import <StoreKit/StoreKit.h>
#import <ASATools/ASATools-Swift.h>
`

const ASATOOLS_APPDELEGATE_INIT_CODE = '  [[ASATools instance] attributeWithApiToken:@"%TOKEN%" completion:nil];'

module.exports = function withASATools(config, {apiKey}) {
  if (!apiKey || apiKey.length != 36) {
    throw new Error(`Please provide proper apiKey for ASATools plugin in expo plugins config`);
  }

  // Add dependency to Podfile
  config = withPodfile(config, (config) => {
    var contents = config.modResults.contents
    
    if (!contents.includes(ASATOOLS_PODFILE_LINE)) {
        const lines = contents.split('\n');
        const index = lines.findIndex((line) =>
          /\s+use_expo_modules!/.test(line)
        );

        config.modResults.contents = [
          ...lines.slice(0,index),
          ASATOOLS_PODFILE_LINE,
          ...lines.slice(index)
        ].join('\n')
    }

    return config;
  });

  // Add initialization code to AppDelegate
  config = withAppDelegate(config, (config) => {
    if (["objc", "objcpp"].includes(config.modResults.language)) {
      var appDelegate = config.modResults.contents

      if (!appDelegate.includes(ASATOOLS_APPDELEGATE_IMPORT)) {
        appDelegate = appDelegate.replace(/@implementation AppDelegate/, (match, group) => 
          `${ASATOOLS_APPDELEGATE_IMPORT}\n${match}`
        )
      }

      const initCode = ASATOOLS_APPDELEGATE_INIT_CODE.replace("%TOKEN%", apiKey);
      const applicationDidFinishLaunchingMethod = /- \(BOOL\)application:.*didFinishLaunchingWithOptions:.*\n?{/gm

      if (!appDelegate.includes(initCode)) {
        appDelegate = appDelegate.replace(applicationDidFinishLaunchingMethod, (match, group) => 
          `${match}\n${initCode}`
        );
      }

      config.modResults.contents = appDelegate
    } else {
      throw new Error(`AppDelegate not in Objective-C/C++. This plugin only supports Objective-C/C++. Current language: ${config.modResults.language}`);
    }

    return config;
  });

  return config;
};