import { CBCore } from "cbcore-ts"
import { UIColor, UIRoute, UIView, UIViewController } from "uicore-ts"


export class InformationViewController extends UIViewController {
    
    
    constructor(view: UIView) {
        
        super(view)
        
        // Code for further setup if necessary
        
        this.view.backgroundColor = UIColor.whiteColor
        
    }
    
    
    static override readonly routeComponentName = "information"
    
    static override readonly ParameterIdentifierName = {
        
        "key": "key"
        
    }
    
    
    override async handleRoute(route: UIRoute) {
    
        await super.handleRoute(route)
        
        CBCore.sharedInstance.didSetLanguageKey()
    
        const inquiryComponent = route.componentWithName(InformationViewController.routeComponentName)
    
        const key = inquiryComponent?.parameters[InformationViewController.ParameterIdentifierName.key]
    
        this.view.setInnerHTML(key, "Failed to load data for key")
    
        this.view.setNeedsLayoutUpToRootView()
    
        // @ts-ignore
        const imgLoad = imagesLoaded(this.view.viewHTMLElement)
    
        const imagesDidLoad = () => {
        
            console.log("ALWAYS - all images have been loaded")
            this.view.setNeedsLayoutUpToRootView()
        
            imgLoad.off("always", imagesDidLoad)
        
        
        }
    
        imgLoad.on("always", imagesDidLoad)
        
    }
    
    
    
    override updateViewConstraints() {
        
        super.updateViewConstraints()
        
    }
    
    
    
    override updateViewStyles() {
        
        super.updateViewStyles()
        
    }
    
    
    
    override viewDidLayoutSubviews() {
        
        super.viewDidLayoutSubviews()
        
    }
    
    
    
    override layoutViewSubviews() {
        
        super.layoutViewSubviews()
    
        const padding = this.core.paddingLength
        const labelHeight = padding
    
        // View bounds
        const bounds = this.view.bounds.rectangleWithInset(padding)
    
    
    
    
    
    }
    
    
    
    
    
}








































































