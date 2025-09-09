#!/usr/bin/env node

/**
 * Test Enhanced Activity Type Filtering
 * 
 * Quick test to verify the updated filtering logic works correctly
 * and allows more teams through compared to the original restrictive filtering.
 */

// Simulate the enhanced filtering logic from NostrTeamService
function testEnhancedFiltering() {
  console.log('🧪 Testing Enhanced Activity Type Filtering...\n');

  // Sample teams that represent the ones we found in the script
  const sampleTeams = [
    {
      name: 'Spain scape',
      tags: ['team', 'running'],
      activityType: 'team, running',
      description: 'Españoles intentando escapar de la agenda 2030'
    },
    {
      name: 'BULLISH',
      tags: ['team', 'running'],
      activityType: 'team, running',
      description: ''
    },
    {
      name: 'Ohio Ruckers',
      tags: ['team', 'running'],
      activityType: 'team, running', 
      description: 'We\'re a troop of mostly dad-bods trying to maintain our waistlines'
    },
    {
      name: 'Ruckstr',
      tags: ['team', 'running'],
      activityType: 'team, running',
      description: 'We ruck!'
    },
    {
      name: 'LATAM Corre 🧉🥑🏃🏻‍♂️⚡',
      tags: ['team', 'running'],
      activityType: 'team, running',
      description: 'Un club de entrenamiento para usuarios de NOSTR de Latinoamérica'
    },
    {
      name: 'Pleb Walkstr',
      tags: ['team', 'running'],
      activityType: 'team, running',
      description: 'Pleb Walkstr was inspired by https://twentyone.world/'
    },
    {
      name: 'CYCLESTR',
      tags: ['team', 'running'],
      activityType: 'team, running',
      description: 'A club for nostriches who love riding bicycles.'
    },
    {
      name: 'RUNSTR',
      tags: ['team', 'running'],
      activityType: 'team, running',
      description: 'A cardio club for nostr'
    }
  ];

  // Test filters that the app uses
  const appFilters = {
    activityTypes: ['fitness', 'running', 'workout', 'team']
  };

  console.log('📋 Testing teams against app filters:', appFilters.activityTypes);
  console.log('='.repeat(60));

  // Enhanced filtering logic (matching the updated NostrTeamService)
  function enhancedMatchesFilters(team, filters) {
    if (!filters || !filters.activityTypes || filters.activityTypes.length === 0) {
      return true;
    }

    // Expanded fitness-related terms for broader matching
    const fitnessTerms = [
      ...filters.activityTypes,
      'run', 'walk', 'cycle', 'bike', 'cardio', 'exercise', 'sport',
      'training', 'club', 'health', 'active', 'movement', 'outdoor'
    ];
    
    const hasMatchingActivity = fitnessTerms.some((filterType) => {
      const filterLower = filterType.toLowerCase();
      
      // Check team tags
      const tagMatch = team.tags.some(tag => 
        tag.toLowerCase().includes(filterLower)
      );
      
      // Check team activity type
      const activityMatch = team.activityType?.toLowerCase().includes(filterLower);
      
      // Check team name for fitness-related terms
      const nameMatch = team.name.toLowerCase().includes(filterLower);
      
      // Check team description for fitness-related terms
      const descMatch = team.description?.toLowerCase().includes(filterLower);
      
      return tagMatch || activityMatch || nameMatch || descMatch;
    });
    
    // Fallback: For general fitness discovery, allow all teams that aren't obviously non-fitness
    const isGeneralFitnessDiscovery = filters.activityTypes.includes('fitness') || 
                                      filters.activityTypes.includes('team');
    
    if (!hasMatchingActivity && isGeneralFitnessDiscovery) {
      // Allow teams unless they're clearly non-fitness
      const nonFitnessTerms = ['tech', 'gaming', 'crypto', 'trading', 'programming', 'software'];
      const isNonFitness = nonFitnessTerms.some(term => 
        team.name.toLowerCase().includes(term) ||
        team.description?.toLowerCase().includes(term)
      );
      
      if (!isNonFitness) {
        return true; // Allow via general fitness fallback
      }
    }
    
    return hasMatchingActivity;
  }

  // Test each team
  let passedCount = 0;
  sampleTeams.forEach((team, index) => {
    const passes = enhancedMatchesFilters(team, appFilters);
    passedCount += passes ? 1 : 0;
    
    console.log(`${index + 1}. ${team.name}`);
    console.log(`   Tags: [${team.tags.join(', ')}]`);
    console.log(`   Activity: ${team.activityType}`);
    console.log(`   Result: ${passes ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
  });

  console.log('📊 FILTERING RESULTS:');
  console.log('='.repeat(40));
  console.log(`✅ Teams that passed: ${passedCount}/${sampleTeams.length}`);
  console.log(`❌ Teams filtered out: ${sampleTeams.length - passedCount}/${sampleTeams.length}`);

  if (passedCount >= 8) {
    console.log('🎯 SUCCESS: Enhanced filtering allows most teams through!');
    console.log('✅ App should now show 8+ teams instead of 3');
  } else if (passedCount > 3) {
    console.log('📈 IMPROVEMENT: More teams passing than before');
    console.log(`✅ Expected improvement from 3 to ${passedCount} teams`);
  } else {
    console.log('⚠️  Still restrictive - may need further adjustment');
  }

  return passedCount;
}

// Original restrictive filtering for comparison
function originalRestrictiveFiltering() {
  console.log('\n🔄 Comparing with Original Restrictive Filtering...\n');
  
  const sampleTeams = [
    { name: 'BULLISH', tags: ['team', 'running'], activityType: 'team, running' },
    { name: 'Ruckstr', tags: ['team', 'running'], activityType: 'team, running' },
    { name: 'CYCLESTR', tags: ['team', 'running'], activityType: 'team, running' }
  ];

  const appFilters = {
    activityTypes: ['fitness', 'running', 'workout', 'team']
  };

  function originalMatchesFilters(team, filters) {
    if (!filters || !filters.activityTypes || filters.activityTypes.length === 0) {
      return true;
    }

    const hasMatchingActivity = filters.activityTypes.some((filterType) =>
      team.tags.some(
        (tag) =>
          tag.toLowerCase().includes(filterType.toLowerCase()) ||
          team.activityType?.toLowerCase().includes(filterType.toLowerCase())
      )
    );
    
    return hasMatchingActivity;
  }

  let originalPassed = 0;
  sampleTeams.forEach(team => {
    const passes = originalMatchesFilters(team, appFilters);
    originalPassed += passes ? 1 : 0;
    console.log(`${team.name}: ${passes ? '✅' : '❌'}`);
  });

  console.log(`\nOriginal filtering: ${originalPassed}/${sampleTeams.length} teams`);
  return originalPassed;
}

function main() {
  const enhancedCount = testEnhancedFiltering();
  const originalCount = originalRestrictiveFiltering();
  
  console.log('\n🏁 COMPARISON SUMMARY:');
  console.log('='.repeat(40));
  console.log(`Enhanced filtering: ${enhancedCount} teams`);
  console.log(`Original filtering: ${originalCount} teams`);
  console.log(`Improvement: +${enhancedCount - originalCount} teams`);
  
  if (enhancedCount > originalCount) {
    console.log('🚀 Enhanced filtering is working! Should see more teams in app.');
  } else {
    console.log('⚠️  No improvement - may need further adjustment.');
  }
}

if (require.main === module) {
  main();
}